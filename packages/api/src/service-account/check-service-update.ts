import type { Igsn } from "@projet-igsn/domain/igsn/model";
import type { CoreSampleBody } from "@projet-igsn/domain/sample/core/core-sample-schema";
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
import { updateSampleSchema } from "@projet-igsn/domain/sample/sample";
import { canBecomeSeries } from "@projet-igsn/domain/sample/type/can-become-series";
import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { managerScope } from "@projet-igsn/domain/user/moderation-scope";

import type { ServiceSampleChecksDeps } from "./service-sample-checks.ts";

import {
  PARENT_CYCLE,
  SECOND_PARENT_REFUSED,
} from "../sample/service/add-sample-parents.ts";
import { findCyclicParentLinks } from "../sample/service/find-cyclic-parent-links.ts";
import { uploadLimit } from "../sample/upload-limit.ts";
import {
  childIssues,
  type ResolvedParent,
  parentNotFoundIssues,
  processStepsOnRootIssue,
  refusedSeriesIssues,
  seriesIssues,
} from "./create-service-sample-issues.ts";
import {
  accountChildCandidates,
  findPublished,
  normalizedIgsn,
  resolveParents,
  resolvedIds,
  resolveRelated,
} from "./resolve-service-relations.ts";
import { SAMPLE_KEY_PATH } from "./service-sample-checks.ts";
import {
  coreSampleIssue,
  frozenFieldIssues,
  publishBlockerIssues,
  serviceSampleIssue,
  zodIssues,
} from "./service-sample-issue.ts";

export type CheckedUpdate = {
  current: Sample;
  merged: CreateSample;
  parents: Sample[];
};

export type UpdateRefusal = "not_found" | "forbidden" | "frozen" | "invalid";

export type CheckedUpdateResult =
  | { value: CheckedUpdate }
  | { refusal: UpdateRefusal; issues: ServiceSampleIssue[] };

const refusedUpdate = (
  refusal: UpdateRefusal,
  issues: ServiceSampleIssue[],
) => ({ refusal, issues });

const findServiceParentIssues = async (
  samples: ServiceSampleChecksDeps["samples"],
  current: Sample,
  resolved: ResolvedParent[],
): Promise<ServiceSampleIssue[]> => {
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
  return [
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
};

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
  const { sample, parents, children, series } = fromCoreSample(body);
  const submitted = new Set(parents.map(({ igsn }) => normalizedIgsn(igsn)));
  if (current.parents.some(({ igsn }) => !submitted.has(igsn))) {
    return refusedUpdate("frozen", [
      serviceSampleIssue("field_frozen", ["relations"]),
    ]);
  }
  const held = new Map(current.children.map(({ id, igsn }) => [igsn, id]));
  const heldIdOf = ({ igsn }: { igsn: string }) =>
    held.get(igsnSchema.safeParse(igsn).data ?? "");
  const [joined, ...extraSeries] = series;
  const isStoredSeries =
    (joined === undefined ? null : igsnSchema.safeParse(joined.igsn).data) ===
    (current.series?.igsn ?? null);
  const unheldChildren = children.filter(
    (child) => heldIdOf(child) === undefined,
  );
  const resolvedRelated = await resolveRelated(
    accountChildCandidates(samples, account),
    [
      ...unheldChildren,
      ...(isStoredSeries || joined === undefined ? [] : [joined]),
    ],
  );
  const resolvedChildren = resolvedRelated.slice(0, unheldChildren.length);
  const resolvedSeries = resolvedRelated.slice(unheldChildren.length);
  const stored = new Set(current.parents.map(({ igsn }) => igsn));
  const resolved = await resolveParents(
    samples,
    parents.filter(({ igsn }) => !stored.has(normalizedIgsn(igsn))),
  );
  const parentIssues = await findServiceParentIssues(
    samples,
    current,
    resolved,
  );
  if (parentIssues.length > 0) {
    return refusedUpdate("invalid", parentIssues);
  }
  const added = resolved
    .map(({ sample: parent }) => parent)
    .filter((parent) => parent !== null);
  const parsed = updateSampleSchema.safeParse({
    ...keepContactLinks(sample, current),
    parentIds: [...current.parents, ...added].map(({ id }) => id),
    seriesId: isStoredSeries
      ? (current.series?.id ?? null)
      : (resolvedSeries[0]?.sample?.id ?? null),
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
  const ineligible = [
    ...childIssues(resolvedChildren, current.id),
    ...seriesIssues(resolvedSeries, current),
    ...refusedSeriesIssues(extraSeries),
  ];
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
