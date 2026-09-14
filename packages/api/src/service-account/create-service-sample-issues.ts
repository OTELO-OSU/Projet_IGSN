import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  CreateServiceSample,
  ServiceSampleIssue,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { publishBlockersOf } from "@projet-igsn/domain/sample/publication/new-publish-blockers";
import { z } from "zod";

import { unattachableIndexes } from "../manual-group/has-unattachable.ts";
import { findEligibleParent } from "../sample/find-eligible-parent.ts";
import { uploadLimit } from "../sample/upload-limit.ts";
import {
  publishBlockerIssues,
  serviceSampleIssue,
} from "./service-sample-issue.ts";

type Deps = {
  samples: SampleRepository;
  users: UserRepository;
  manualGroups: Pick<ManualGroupRepository, "listAttachableForUser">;
};

export async function createServiceSampleIssues(
  { samples, users, manualGroups }: Deps,
  ownerId: string,
  input: CreateServiceSample,
): Promise<ServiceSampleIssue[]> {
  const owner = { id: ownerId, superAdmin: false };
  const issues: ServiceSampleIssue[] = [];
  const parentIds = input.parentIds ?? [];
  const parents = await Promise.all(
    parentIds.map(async (id) =>
      z.uuid().safeParse(id).success
        ? findEligibleParent(samples, users, owner, id)
        : null,
    ),
  );
  if (parentIds.length > 0 && input.location != null) {
    issues.push(
      serviceSampleIssue("location_inherited_from_parent", ["location"]),
    );
  }
  issues.push(
    ...publishBlockerIssues(
      publishBlockersOf(
        {
          ...input,
          location:
            parentIds.length === 1
              ? (parents[0]?.location ?? input.location)
              : input.location,
        },
        uploadLimit,
        parents,
      ).filter((blocker) => blocker !== "parent_not_found"),
    ),
    ...parents.flatMap((parent, index) =>
      parent === null
        ? [serviceSampleIssue("parent_not_found", ["parentIds", index])]
        : [],
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
          "manualGroupIds",
          index,
        ]),
      );
    }
  }
  return issues;
}
