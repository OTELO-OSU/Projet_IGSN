import type { CreateSampleAttachment } from "@projet-igsn/domain/sample/attachment/repository";
import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";
import type { z } from "zod";

import { ATTACHMENT_FILE_NAME_HEADER } from "@projet-igsn/domain/sample/import/attachment-sheet";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import { PUBLISH_BLOCKER_PATH } from "@projet-igsn/domain/sample/publication/publish-blocker-path";
import { publishedEditSchema } from "@projet-igsn/domain/sample/publication/published-sample-schema";
import {
  type PublishableFields,
  type PublishBlocker,
  publishBlockerSchema,
  samplePublishBlockers,
  samplePublishRequirements,
  toPublishableFields,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import {
  type RelationTargetResourceType,
  relationTargetResourceTypeSchema,
} from "@projet-igsn/domain/sample/relation/target-resource-type";
import {
  type CreateSample,
  createSampleSchema,
} from "@projet-igsn/domain/sample/sample";

import type {
  AttachmentCandidate,
  SampleCandidate,
} from "./build-sample-inputs.ts";
import type { Column } from "./columns.ts";

import { uploadLimit } from "../upload-limit.ts";
import { valueAt } from "./build-sample-inputs.ts";
import {
  ATTACHMENT_RESOURCE_TYPE_HEADER,
  DATA_SHEETS,
  plainHeader,
  SAMPLE_KEY_HEADER,
  SHEETS,
} from "./columns.ts";

export type AttachmentMetadata = Omit<CreateSampleAttachment, "mediaType">;

type ValidatedSample = {
  input: CreateSample;
  attachments: AttachmentMetadata[];
};

type SheetColumn = { sheet: string; column: Column };

const COLUMNS: readonly SheetColumn[] = DATA_SHEETS.flatMap((sheet) =>
  sheet.columns.map((column) => ({ sheet: sheet.name, column })),
);

const COLUMNS_BY_SHEET = Map.groupBy(COLUMNS, ({ sheet }) => sheet);

const prefixesOf = (keys: readonly string[]) =>
  keys.map((_, index) => keys.slice(0, keys.length - index).join("."));

function columnAt(
  columns: readonly SheetColumn[],
  path: readonly string[],
): SheetColumn | undefined {
  for (const prefix of prefixesOf(path)) {
    const found = columns.find(({ column }) =>
      isPathAtOrUnder(column.path, prefix),
    );
    if (found !== undefined) return found;
  }
  return undefined;
}

export function placeOf(
  sample: SampleCandidate,
  path: readonly PropertyKey[],
): Omit<ImportIssue, "code"> {
  const keys = path.map(String);
  const source = prefixesOf(keys)
    .map((prefix) => sample.rowsByPath[prefix])
    .find((candidate) => candidate !== undefined);
  const found = columnAt(
    source === undefined ? COLUMNS : (COLUMNS_BY_SHEET.get(source.sheet) ?? []),
    path.filter((key) => typeof key === "string"),
  );
  const place =
    source ??
    (found?.column.path === undefined
      ? undefined
      : sample.rowsByPath[found.column.path]) ??
    (found === undefined || found.sheet === SHEETS.samples
      ? { sheet: SHEETS.samples, row: sample.row }
      : { sheet: found.sheet });
  return {
    ...place,
    ...(found === undefined ? {} : { column: plainHeader(found.column) }),
  };
}

const INDEXED_BLOCKER_FIELD: Partial<Record<PublishBlocker, string>> = {
  relation_resource_type_missing: "targetResourceType",
  process_step_date_missing: "date",
  additional_role_firstname_missing: "personFirstname",
  additional_role_lastname_missing: "personLastname",
};

function blockerIssuesOf(
  sample: SampleCandidate,
  blocker: PublishBlocker,
  fields: PublishableFields,
): ImportIssue[] {
  const path = PUBLISH_BLOCKER_PATH[blocker];
  const field = INDEXED_BLOCKER_FIELD[blocker];
  const rowPaths = samplePublishRequirements(fields).flatMap(
    ({ blocker: candidate, isMet, index }) =>
      candidate === blocker && !isMet && index !== undefined
        ? [[...path, index, ...(field === undefined ? [] : [field])]]
        : [],
  );
  return (rowPaths.length === 0 ? [path] : rowPaths).map((blockerPath) => ({
    ...placeOf(sample, blockerPath),
    code: blocker,
  }));
}

function issuesOf(
  sample: SampleCandidate,
  { path, code, message, ...issue }: z.core.$ZodIssue,
  fields: PublishableFields,
): ImportIssue[] {
  const domainCode =
    "params" in issue && typeof issue.params?.code === "string"
      ? issue.params.code
      : undefined;
  const blocker = publishBlockerSchema.safeParse(domainCode);
  return blocker.success
    ? blockerIssuesOf(sample, blocker.data, fields)
    : [{ ...placeOf(sample, path), code: domainCode ?? code, message }];
}

export function leavesOf(
  value: unknown,
  path: readonly (string | number)[] = [],
): (string | number)[][] {
  if (value === undefined) return [];
  if (Array.isArray(value))
    return value.flatMap((inner, index) => leavesOf(inner, [...path, index]));
  return value !== null && typeof value === "object"
    ? Object.entries(value).flatMap(([key, inner]) =>
        leavesOf(inner, [...path, key]),
      )
    : [[...path]];
}

const droppedIssues = (sample: SampleCandidate, parsed: unknown) =>
  leavesOf(sample.input)
    .filter((path) => valueAt(parsed, path) === undefined)
    .map(
      (path): ImportIssue => ({
        ...placeOf(sample, path),
        code: "not_applicable",
      }),
    );

function keptFieldsOf(sample: SampleCandidate) {
  const fields = Object.entries(createSampleSchema.shape).map(
    ([key, schema]) => [key, schema.safeParse(sample.input[key])] as const,
  );
  return {
    kept: toPublishableFields(
      Object.fromEntries(
        fields.flatMap(([key, field]) =>
          field.success ? [[key, field.data]] : [],
        ),
      ),
    ),
    unknowable: new Set(
      fields.flatMap(([key, field]) => (field.success ? [] : [key])),
    ),
  };
}

function keptFieldBlockers(
  sample: SampleCandidate,
  failed: readonly z.core.$ZodIssue[],
  { kept, unknowable }: ReturnType<typeof keptFieldsOf>,
): ImportIssue[] {
  const reported = new Set(
    failed.map((issue) => ("params" in issue ? issue.params?.code : undefined)),
  );
  return samplePublishBlockers(kept)
    .filter(
      (blocker) =>
        !unknowable.has(String(PUBLISH_BLOCKER_PATH[blocker][0])) &&
        !reported.has(blocker) &&
        !sample.existingBlockers?.includes(blocker),
    )
    .flatMap((blocker) => blockerIssuesOf(sample, blocker, kept));
}

const attachmentIssueAt = (
  row: number,
  column: string,
  code: string,
): ImportIssue => ({ sheet: SHEETS.attachments, row, column, code });

type ParsedAttachment = Omit<AttachmentCandidate, "targetResourceType"> & {
  targetResourceType: RelationTargetResourceType | null;
  isResourceTypeInvalid: boolean;
};

const parsedAttachmentOf = ({
  targetResourceType,
  ...attachment
}: AttachmentCandidate): ParsedAttachment => {
  const parsed = relationTargetResourceTypeSchema.safeParse(targetResourceType);
  return {
    ...attachment,
    targetResourceType: parsed.success ? parsed.data : null,
    isResourceTypeInvalid: targetResourceType !== undefined && !parsed.success,
  };
};

const NO_FIELDS = toPublishableFields({});

const attachmentBlockersOf = (attachments: readonly ParsedAttachment[]) =>
  samplePublishBlockers({ ...NO_FIELDS, attachments }, uploadLimit);

function resourceTypeIssues(attachment: ParsedAttachment): ImportIssue[] {
  const code = attachment.isResourceTypeInvalid
    ? "invalid_value"
    : attachmentBlockersOf([attachment]).find(
        (blocker) => blocker === "attachment_metadata_missing",
      );
  return code === undefined
    ? []
    : [
        attachmentIssueAt(
          attachment.row,
          ATTACHMENT_RESOURCE_TYPE_HEADER,
          code,
        ),
      ];
}

function attachmentIssues(
  attachments: readonly ParsedAttachment[],
  providedFileNames: ReadonlySet<string>,
): ImportIssue[] {
  const rowIssues = attachments.flatMap((attachment) => [
    ...(attachment.name !== undefined && providedFileNames.has(attachment.name)
      ? []
      : [
          attachmentIssueAt(
            attachment.row,
            ATTACHMENT_FILE_NAME_HEADER,
            "missing_attachment_file",
          ),
        ]),
    ...resourceTypeIssues(attachment),
  ]);
  const firstExcess = attachments[uploadLimit];
  return firstExcess === undefined ||
    !attachmentBlockersOf(attachments).includes("attachment_limit_exceeded")
    ? rowIssues
    : [
        ...rowIssues,
        attachmentIssueAt(
          firstExcess.row,
          SAMPLE_KEY_HEADER,
          "attachment_limit_exceeded",
        ),
      ];
}

const metadataOf = ({
  name,
  title,
  targetResourceType,
  description,
}: ParsedAttachment): AttachmentMetadata[] =>
  name === undefined ? [] : [{ name, title, targetResourceType, description }];

function failedIssues(
  sample: SampleCandidate,
  failed: readonly z.core.$ZodIssue[],
): ImportIssue[] {
  const fields = keptFieldsOf(sample);
  return [
    ...failed.flatMap((issue) => issuesOf(sample, issue, fields.kept)),
    ...keptFieldBlockers(sample, failed, fields),
  ];
}

export function validateSamples(
  samples: readonly SampleCandidate[],
  providedFileNames: ReadonlySet<string>,
): {
  issues: ImportIssue[];
  samples: ValidatedSample[];
} {
  const issues: ImportIssue[] = [];
  const validated: ValidatedSample[] = [];
  for (const sample of samples) {
    const parsed = publishedEditSchema(sample.existingBlockers ?? []).safeParse(
      sample.input,
    );
    const attachments = sample.attachments.map(parsedAttachmentOf);
    const found = [
      ...(parsed.success
        ? droppedIssues(sample, parsed.data)
        : failedIssues(sample, parsed.error.issues)),
      ...attachmentIssues(attachments, providedFileNames),
    ];
    issues.push(...found);
    if (parsed.success && found.length === 0)
      validated.push({
        input: parsed.data,
        attachments: attachments.flatMap(metadataOf),
      });
  }
  return { issues, samples: validated };
}
