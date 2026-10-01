import type { Igsn } from "@projet-igsn/domain/igsn/model";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { CoreSampleBody } from "@projet-igsn/domain/sample/core/core-sample-schema";
import type {
  DuplicateCriteria,
  SuspectedDuplicate,
} from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";
import type { ServiceSampleIssue } from "@projet-igsn/domain/service-account/service-sample-validator";

import { igsnSchema } from "@projet-igsn/domain/igsn/model";
import { keepContactLinks } from "@projet-igsn/domain/sample/contact-link";
import { fromCoreSample } from "@projet-igsn/domain/sample/core/from-core-sample";
import { frozenFieldEdits } from "@projet-igsn/domain/sample/publication/frozen-field-edits";
import { newPublishBlockers } from "@projet-igsn/domain/sample/publication/new-publish-blockers";
import { mergePublishedEdit } from "@projet-igsn/domain/sample/publication/published-field-lock";
import { duplicateCheckCriteria } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import {
  createSampleSchema,
  updateSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { managerScope } from "@projet-igsn/domain/user/moderation-scope";

import { uploadLimit } from "../sample/upload-limit.ts";
import {
  type ResolvedParent,
  createServiceSampleIssues,
  processStepsOnRootIssue,
} from "./create-service-sample-issues.ts";
import {
  frozenFieldIssues,
  publishBlockerIssues,
  serviceSampleIssue,
  zodIssues,
} from "./service-sample-issue.ts";

export type ServiceSampleChecksDeps = {
  samples: Pick<
    SampleRepository,
    "getPublicByIgsn" | "isModerated" | "findDuplicates"
  >;
  manualGroups: Pick<ManualGroupRepository, "listAttachableForUser">;
};

export type Checked<T> = { value: T } | { issues: ServiceSampleIssue[] };

export type CheckedCreate = { input: CreateSample; parents: Sample[] };

export type CheckedUpdate = { current: Sample; merged: CreateSample };

export const SAMPLE_KEY_PATH = ["identification", "sampleIdentifier"];

const refused = (...issues: ServiceSampleIssue[]) => ({ issues });

export async function findPublished(
  samples: ServiceSampleChecksDeps["samples"],
  igsn: Igsn,
): Promise<Sample | null> {
  const sample = await samples.getPublicByIgsn(igsn);
  return sample?.status === "published" ? sample : null;
}

const findPublishedByIgsn = (
  samples: ServiceSampleChecksDeps["samples"],
  igsn: string,
) => {
  const parsed = igsnSchema.safeParse(igsn);
  return parsed.success ? findPublished(samples, parsed.data) : null;
};

export async function checkServiceCreate(
  { samples, manualGroups }: ServiceSampleChecksDeps,
  ownerId: string,
  body: CoreSampleBody,
): Promise<Checked<CheckedCreate>> {
  const { sample, parents } = fromCoreSample(body);
  const resolved: ResolvedParent[] = await Promise.all(
    parents.map(async ({ igsn, relationIndex }) => ({
      relationIndex,
      sample: await findPublishedByIgsn(samples, igsn),
    })),
  );
  const parsed = createSampleSchema.safeParse({
    ...sample,
    parentIds: resolved
      .map(({ sample: parent }) => parent?.id)
      .filter((id) => id != null),
  });
  if (!parsed.success) {
    return refused(...zodIssues(parsed.error));
  }
  const issues = await createServiceSampleIssues(
    { manualGroups },
    ownerId,
    parsed.data,
    resolved,
  );
  if (issues.length > 0) {
    return refused(...issues);
  }
  return {
    value: {
      input: parsed.data,
      parents: resolved
        .map(({ sample: parent }) => parent)
        .filter((parent) => parent !== null),
    },
  };
}

export async function checkServiceUpdate(
  { samples }: ServiceSampleChecksDeps,
  account: ServiceAccount,
  igsn: Igsn,
  body: CoreSampleBody,
): Promise<Checked<CheckedUpdate>> {
  const current = await findPublished(samples, igsn);
  if (!current) {
    return refused(serviceSampleIssue("sample_not_found", SAMPLE_KEY_PATH));
  }
  if (
    !(await samples.isModerated(
      current.id,
      managerScope(account.id, account.managedGroups),
    ))
  ) {
    return refused(serviceSampleIssue("sample_not_editable", SAMPLE_KEY_PATH));
  }
  const { sample, parents } = fromCoreSample(body);
  const stored = new Set(current.parents.map(({ igsn }) => igsn));
  const changed = parents.findIndex(
    ({ igsn }) => !stored.has(igsnSchema.parse(igsn)),
  );
  if (changed !== -1 || parents.length !== stored.size) {
    return refused(
      serviceSampleIssue("field_frozen", [
        "relations",
        parents[changed]?.relationIndex ?? 0,
      ]),
    );
  }
  const parsed = updateSampleSchema.safeParse({
    ...keepContactLinks(sample, current),
    // Core has no slot for the local id description, so a round trip keeps the stored one.
    localIdDescription:
      sample.localId == null ? null : current.localIdDescription,
  });
  if (!parsed.success) {
    return refused(...zodIssues(parsed.error));
  }
  const merged = mergePublishedEdit(current, parsed.data);
  const frozen = frozenFieldEdits(parsed.data, merged);
  if (frozen.length > 0) {
    return refused(...frozenFieldIssues(frozen));
  }
  const blockers = newPublishBlockers(current, merged, uploadLimit);
  if (blockers.length > 0) {
    return refused(...publishBlockerIssues(blockers));
  }
  if ((merged.processSteps?.length ?? 0) > 0 && current.parents.length === 0) {
    return refused(processStepsOnRootIssue());
  }
  return { value: { current, merged } };
}

const suspectedDuplicates = (
  samples: ServiceSampleChecksDeps["samples"],
  criteria: DuplicateCriteria | null,
  exclude?: string,
): Promise<SuspectedDuplicate[]> =>
  criteria === null
    ? Promise.resolve([])
    : samples.findDuplicates(criteria, exclude);

export const createDuplicates = (
  samples: ServiceSampleChecksDeps["samples"],
  { input }: CheckedCreate,
  confirmed: boolean | undefined,
): Promise<SuspectedDuplicate[]> =>
  suspectedDuplicates(samples, duplicateCheckCriteria(input, { confirmed }));

export const updateDuplicates = (
  samples: ServiceSampleChecksDeps["samples"],
  { current, merged }: CheckedUpdate,
  confirmed: boolean | undefined,
): Promise<SuspectedDuplicate[]> =>
  suspectedDuplicates(
    samples,
    duplicateCheckCriteria(merged, { previous: current, confirmed }),
    current.id,
  );
