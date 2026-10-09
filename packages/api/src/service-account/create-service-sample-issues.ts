import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SeriesLinkCandidate } from "@projet-igsn/domain/sample/repository";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { ServiceSampleIssue } from "@projet-igsn/domain/service-account/service-sample-validator";

import { soleParent } from "@projet-igsn/domain/sample/parent/sole-parent";
import { canJoinSeries } from "@projet-igsn/domain/sample/publication/can-join-series";
import { publishBlockersOf } from "@projet-igsn/domain/sample/publication/new-publish-blockers";

import { unattachableIndexes } from "../manual-group/has-unattachable.ts";
import { isEligibleChild } from "../sample/is-eligible-child.ts";
import { isEligibleSeries } from "../sample/is-eligible-series.ts";
import { PROCESS_STEPS_NEED_PARENT } from "../sample/service/replace-sample-process-steps.ts";
import { uploadLimit } from "../sample/upload-limit.ts";
import {
  coreSampleIssue,
  publishBlockerIssues,
  serviceSampleIssue,
} from "./service-sample-issue.ts";

export type ResolvedRelated<T> = {
  sample: T | null;
  relationIndex: number;
};

export type ResolvedParent = ResolvedRelated<Sample>;

const relationTargetPath = (relationIndex: number) => [
  "relations",
  relationIndex,
  "targetIdentifier",
  "value",
];

export const childIssues = (
  children: readonly ResolvedRelated<SeriesLinkCandidate>[],
  seriesId?: string,
): ServiceSampleIssue[] =>
  children.flatMap(({ sample: child, relationIndex }) =>
    child !== null && child.moderated && isEligibleChild(child, seriesId)
      ? []
      : [
          serviceSampleIssue(
            child === null ? "child_not_found" : "child_not_eligible",
            relationTargetPath(relationIndex),
          ),
        ],
  );

export const refusedSeriesIssues = (
  series: readonly { relationIndex: number }[],
): ServiceSampleIssue[] =>
  series.map(({ relationIndex }) =>
    serviceSampleIssue(
      "series_not_eligible",
      relationTargetPath(relationIndex),
    ),
  );

export const seriesIssues = (
  series: readonly ResolvedRelated<SeriesLinkCandidate>[],
  member: Sample,
): ServiceSampleIssue[] =>
  series.flatMap(({ sample: target, relationIndex }) =>
    target !== null &&
    target.moderated &&
    isEligibleSeries(target) &&
    canJoinSeries(member)
      ? []
      : [
          serviceSampleIssue(
            target === null ? "series_not_found" : "series_not_eligible",
            relationTargetPath(relationIndex),
          ),
        ],
  );

type Deps = {
  manualGroups: Pick<ManualGroupRepository, "listAttachableForUser">;
};

export const processStepsOnRootIssue = () =>
  coreSampleIssue("custom", "processSteps", PROCESS_STEPS_NEED_PARENT);

export const parentNotFoundIssues = (
  parents: readonly ResolvedParent[],
): ServiceSampleIssue[] =>
  parents.flatMap(({ sample, relationIndex }) =>
    sample === null
      ? [
          serviceSampleIssue(
            "parent_not_found",
            relationTargetPath(relationIndex),
          ),
        ]
      : [],
  );

export async function createServiceSampleIssues(
  { manualGroups }: Deps,
  ownerId: string,
  input: CreateSample,
  parents: readonly ResolvedParent[],
): Promise<ServiceSampleIssue[]> {
  const issues: ServiceSampleIssue[] = parentNotFoundIssues(parents);
  if ((input.processSteps?.length ?? 0) > 0 && parents.length === 0) {
    issues.push(processStepsOnRootIssue());
  }
  if (soleParent(parents) !== undefined && input.location != null) {
    issues.push(
      coreSampleIssue("location_inherited_from_parent", ["location"]),
    );
  }
  const resolved = parents
    .map(({ sample }) => sample)
    .filter((sample) => sample !== null);
  issues.push(
    ...publishBlockerIssues(publishBlockersOf(input, uploadLimit, resolved)),
  );
  const submitted = input.manualGroupIds ?? [];
  if (submitted.length > 0) {
    const attachable = await manualGroups.listAttachableForUser(ownerId);
    for (const index of unattachableIndexes(
      submitted,
      attachable.map((group) => group.id),
    )) {
      issues.push(
        serviceSampleIssue("manual_group_not_attachable", [
          "manualGroups",
          index,
          "id",
        ]),
      );
    }
  }
  return issues;
}
