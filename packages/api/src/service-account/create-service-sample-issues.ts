import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  CreateServiceSample,
  ServiceSampleIssue,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { PUBLISH_BLOCKER_PATH } from "@projet-igsn/domain/sample/publication/publish-blocker-path";
import {
  samplePublishBlockers,
  toPublishableFields,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { z } from "zod";

import { findEligibleParent } from "../sample/find-eligible-parent.ts";
import { uploadLimit } from "../sample/upload-limit.ts";

type Deps = {
  samples: SampleRepository;
  users: UserRepository;
  manualGroups: Pick<ManualGroupRepository, "listAttachableForUser">;
};

export async function createServiceSampleIssues(
  { samples, users, manualGroups }: Deps,
  owner: Pick<User, "id" | "superAdmin">,
  input: CreateServiceSample,
): Promise<ServiceSampleIssue[]> {
  const issues: ServiceSampleIssue[] = [];
  const [parentId] = input.parentIds ?? [];
  const parent =
    parentId !== undefined && z.uuid().safeParse(parentId).success
      ? await findEligibleParent(samples, users, owner, parentId)
      : null;
  if (parentId !== undefined && parent === null) {
    issues.push({ path: "parentIds.0", code: "parent_not_found" });
  }
  if (parentId !== undefined && input.location != null) {
    issues.push({ path: "location", code: "location_inherited_from_parent" });
  }
  for (const blocker of samplePublishBlockers(
    {
      ...toPublishableFields({
        ...input,
        location: parent?.location ?? input.location,
      }),
      attachments: [],
    },
    uploadLimit,
  )) {
    const path = PUBLISH_BLOCKER_PATH[blocker];
    issues.push(path === null ? { code: blocker } : { path, code: blocker });
  }
  const submitted = input.manualGroupIds ?? [];
  if (submitted.length > 0) {
    const attachable = new Set(
      (await manualGroups.listAttachableForUser(owner.id)).map(
        (group) => group.id,
      ),
    );
    submitted.forEach((id, index) => {
      if (!attachable.has(id)) {
        issues.push({
          path: `manualGroupIds.${index}`,
          code: "manual_group_not_attachable",
        });
      }
    });
  }
  return issues;
}
