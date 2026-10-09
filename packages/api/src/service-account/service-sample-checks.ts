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
import { canAddParent } from "@projet-igsn/domain/sample/parent/can-add-parent";
import { frozenFieldEdits } from "@projet-igsn/domain/sample/publication/frozen-field-edits";
import { newPublishBlockers } from "@projet-igsn/domain/sample/publication/new-publish-blockers";
import { mergePublishedEdit } from "@projet-igsn/domain/sample/publication/published-field-lock";
import { duplicateCheckCriteria } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import {
  createSampleSchema,
  updateSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { canBecomeSeries } from "@projet-igsn/domain/sample/type/can-become-series";
import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { canDeclareSubSample } from "@projet-igsn/domain/user-sample/can-declare-sub-sample";
import { managerScope } from "@projet-igsn/domain/user/moderation-scope";

import {
  PARENT_CYCLE,
  SECOND_PARENT_REFUSED,
} from "../sample/service/add-sample-parents.ts";
import { findCyclicParentLinks } from "../sample/service/find-cyclic-parent-links.ts";
import { uploadLimit } from "../sample/upload-limit.ts";
import {
  childIssues,
  type ResolvedParent,
  type ResolvedRelated,
  createServiceSampleIssues,
  parentNotFoundIssues,
  processStepsOnRootIssue,
} from "./create-service-sample-issues.ts";
import {
  coreSampleIssue,
  frozenFieldIssues,
  publishBlockerIssues,
  serviceSampleIssue,
  zodIssues,
} from "./service-sample-issue.ts";

export type ServiceSampleChecksDeps = {
  samples: Pick<
    SampleRepository,
    | "listPublishedByIgsns"
    | "listPublicSeriesLinkCandidatesByIgsns"
    | "isModerated"
    | "findDuplicates"
    | "listDescendantIds"
  >;
  manualGroups: Pick<ManualGroupRepository, "listAttachableForUser">;
};

export type Checked<T> = { value: T } | { issues: ServiceSampleIssue[] };

export type CheckedCreate = { input: CreateSample; parents: Sample[] };

export type CheckedUpdate = {
  current: Sample;
  merged: CreateSample;
  parents: Sample[];
};

export type UpdateRefusal = "not_found" | "forbidden" | "frozen" | "invalid";

export type CheckedUpdateResult =
  | { value: CheckedUpdate }
  | { refusal: UpdateRefusal; issues: ServiceSampleIssue[] };

export const SAMPLE_KEY_PATH = ["identification", "sampleIdentifier"];

const refused = (...issues: ServiceSampleIssue[]) => ({ issues });

const refusedUpdate = (
  refusal: UpdateRefusal,
  issues: ServiceSampleIssue[],
) => ({ refusal, issues });

export const findPublished = async (
  samples: ServiceSampleChecksDeps["samples"],
  igsn: Igsn,
): Promise<Sample | null> =>
  (await samples.listPublishedByIgsns([igsn])).get(igsn) ?? null;

const resolveRelated = async <T>(
  listByIgsns: (igsns: string[]) => Promise<ReadonlyMap<string, T>>,
  related: readonly { igsn: string; relationIndex: number }[],
): Promise<ResolvedRelated<T>[]> => {
  const igsns = related.map(({ igsn }) => igsnSchema.safeParse(igsn).data);
  const found = await listByIgsns(igsns.filter((igsn) => igsn !== undefined));
  return related.map(({ relationIndex }, index) => ({
    relationIndex,
    sample: found.get(igsns[index] ?? "") ?? null,
  }));
};

const listDeclarableParents =
  (samples: ServiceSampleChecksDeps["samples"]) =>
  async (igsns: string[]): Promise<ReadonlyMap<string, Sample>> =>
    new Map(
      [...(await samples.listPublishedByIgsns(igsns))].filter(([, parent]) =>
        canDeclareSubSample(parent, { role: null, managed: false }),
      ),
    );

const accountChildCandidates =
  (samples: ServiceSampleChecksDeps["samples"], account: ServiceAccount) =>
  (igsns: string[]) =>
    samples.listPublicSeriesLinkCandidatesByIgsns(
      igsns,
      null,
      managerScope(account.id, account.managedGroups),
    );

const resolvedIds = (
  resolved: readonly ResolvedRelated<{ id: string }>[],
): string[] =>
  resolved.flatMap(({ sample }) => (sample === null ? [] : [sample.id]));

const normalizedIgsn = (igsn: string) =>
  igsnSchema.safeParse(igsn).data ?? igsn;

const resolveParents = (
  samples: ServiceSampleChecksDeps["samples"],
  parents: readonly { igsn: string; relationIndex: number }[],
): Promise<ResolvedParent[]> =>
  resolveRelated(listDeclarableParents(samples), parents);

export async function checkServiceCreate(
  { samples, manualGroups }: ServiceSampleChecksDeps,
  account: ServiceAccount,
  body: CoreSampleBody,
): Promise<Checked<CheckedCreate>> {
  const { sample, parents, children } = fromCoreSample(body);
  const [resolved, resolvedChildren] = await Promise.all([
    resolveRelated(listDeclarableParents(samples), parents),
    resolveRelated(accountChildCandidates(samples, account), children),
  ]);
  const parsed = createSampleSchema.safeParse({
    ...sample,
    parentIds: resolvedIds(resolved),
    childIds: resolvedIds(resolvedChildren),
  });
  if (!parsed.success) {
    return refused(...zodIssues(parsed.error));
  }
  const issues = [
    ...childIssues(resolvedChildren),
    ...(await createServiceSampleIssues(
      { manualGroups },
      account.sampleOwner.id,
      parsed.data,
      resolved,
    )),
  ];
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
): Promise<CheckedUpdateResult> {
  const current = await findPublished(samples, igsn);
  if (!current) {
    return refusedUpdate("not_found", [
      serviceSampleIssue("sample_not_found", SAMPLE_KEY_PATH),
    ]);
  }
  if (
    !(await samples.isModerated(
      current.id,
      managerScope(account.id, account.managedGroups),
    ))
  ) {
    return refusedUpdate("forbidden", [
      serviceSampleIssue("sample_not_editable", SAMPLE_KEY_PATH),
    ]);
  }
  const { sample, parents, children } = fromCoreSample(body);
  const submitted = new Set(parents.map(({ igsn }) => normalizedIgsn(igsn)));
  if (current.parents.some(({ igsn }) => !submitted.has(igsn))) {
    return refusedUpdate("frozen", [
      serviceSampleIssue("field_frozen", ["relations"]),
    ]);
  }
  const held = new Map(current.children.map(({ id, igsn }) => [igsn, id]));
  const heldIdOf = ({ igsn }: { igsn: string }) =>
    held.get(igsnSchema.safeParse(igsn).data ?? "");
  const resolvedChildren = await resolveRelated(
    accountChildCandidates(samples, account),
    children.filter((child) => heldIdOf(child) === undefined),
  );
  const stored = new Set(current.parents.map(({ igsn }) => igsn));
  const resolved = await resolveParents(
    samples,
    parents.filter(({ igsn }) => !stored.has(normalizedIgsn(igsn))),
  );
  const links = resolved.flatMap(({ sample: parent, relationIndex }) =>
    parent === null
      ? []
      : [{ childId: current.id, parentIds: [parent.id], relationIndex }],
  );
  const cyclic = findCyclicParentLinks(
    links,
    await samples.listDescendantIds([current.id]),
  );
  const isSecondParent = !canAddParent(current.parents) || resolved.length > 1;
  const parentIssues = [
    ...(isSecondParent
      ? resolved.map(({ relationIndex }) =>
          serviceSampleIssue(
            "custom",
            ["relations", relationIndex],
            SECOND_PARENT_REFUSED,
          ),
        )
      : []),
    ...parentNotFoundIssues(resolved),
    ...cyclic.map((at) =>
      serviceSampleIssue(
        "custom",
        ["relations", links[at]!.relationIndex, "targetIdentifier", "value"],
        PARENT_CYCLE,
      ),
    ),
  ];
  if (parentIssues.length > 0) {
    return refusedUpdate("invalid", parentIssues);
  }
  const added = resolved
    .map(({ sample: parent }) => parent)
    .filter((parent) => parent !== null);
  const parsed = updateSampleSchema.safeParse({
    ...keepContactLinks(sample, current),
    parentIds: [...current.parents, ...added].map(({ id }) => id),
    childIds: [
      ...children.flatMap((child) => heldIdOf(child) ?? []),
      ...resolvedIds(resolvedChildren),
    ],
    // Core has no slot for the local id description nor the archive contact email, so a round trip keeps the stored ones.
    localIdDescription:
      sample.localId == null ? null : current.localIdDescription,
    repository: {
      ...sample.repository,
      currentArchiveContactEmail:
        current.repository?.currentArchiveContactEmail,
    },
  });
  if (!parsed.success) {
    return refusedUpdate("invalid", zodIssues(parsed.error));
  }
  const merged = mergePublishedEdit(current, parsed.data);
  const frozen = frozenFieldEdits(parsed.data, merged);
  if (frozen.length > 0) {
    return refusedUpdate("frozen", frozenFieldIssues(frozen));
  }
  const ineligible = childIssues(resolvedChildren, current.id);
  if (ineligible.length > 0) {
    return refusedUpdate("invalid", ineligible);
  }
  if (
    isVirtualSample(merged.type) &&
    (!canBecomeSeries(current) || added.length > 0)
  ) {
    return refusedUpdate("invalid", [
      coreSampleIssue(
        "custom",
        ["type"],
        "a series of samples has no parent nor sub-sample",
      ),
    ]);
  }
  const blockers = newPublishBlockers(current, merged, uploadLimit);
  if (blockers.length > 0) {
    return refusedUpdate("invalid", publishBlockerIssues(blockers));
  }
  if (
    (merged.processSteps?.length ?? 0) > 0 &&
    (parsed.data.parentIds?.length ?? 0) === 0
  ) {
    return refusedUpdate("invalid", [processStepsOnRootIssue()]);
  }
  return { value: { current, merged, parents: added } };
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
