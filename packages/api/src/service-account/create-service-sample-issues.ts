import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { ServiceSampleIssue } from "@projet-igsn/domain/service-account/service-sample-validator";

import { soleParent } from "@projet-igsn/domain/sample/parent/sole-parent";
import { publishBlockersOf } from "@projet-igsn/domain/sample/publication/new-publish-blockers";

import { unattachableIndexes } from "../manual-group/has-unattachable.ts";
import { PROCESS_STEPS_NEED_PARENT } from "../sample/service/replace-sample-process-steps.ts";
import { uploadLimit } from "../sample/upload-limit.ts";
import {
  coreSampleIssue,
  publishBlockerIssues,
  serviceSampleIssue,
} from "./service-sample-issue.ts";

export type ResolvedParent = {
  sample: Sample | null;
  relationIndex: number;
};

type Deps = {
  manualGroups: Pick<ManualGroupRepository, "listAttachableForUser">;
};

export const processStepsOnRootIssue = () =>
  coreSampleIssue("custom", "processSteps", PROCESS_STEPS_NEED_PARENT);

export async function createServiceSampleIssues(
  { manualGroups }: Deps,
  ownerId: string,
  input: CreateSample,
  parents: readonly ResolvedParent[],
): Promise<ServiceSampleIssue[]> {
  const issues: ServiceSampleIssue[] = [];
  for (const { sample, relationIndex } of parents) {
    if (sample === null) {
      issues.push(
        serviceSampleIssue("parent_not_found", [
          "relations",
          relationIndex,
          "targetIdentifier",
          "value",
        ]),
      );
    }
  }
  if ((input.processSteps?.length ?? 0) > 0 && parents.length === 0) {
    issues.push(processStepsOnRootIssue());
  }
  const sole = soleParent(parents);
  if (sole !== undefined && input.location != null) {
    issues.push(
      coreSampleIssue("location_inherited_from_parent", ["location"]),
    );
  }
  const resolved = parents
    .map(({ sample }) => sample)
    .filter((sample) => sample !== null);
  issues.push(
    ...publishBlockerIssues(
      publishBlockersOf(
        { ...input, location: sole?.sample?.location ?? input.location },
        uploadLimit,
        resolved,
      ),
    ),
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
