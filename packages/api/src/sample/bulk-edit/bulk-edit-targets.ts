import type { ImportIssueCode } from "@projet-igsn/domain/sample/import/import-report";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";

import type { BulkEditTarget } from "./validate-bulk-edit.ts";

import { sampleAccess } from "../require-sample-access.ts";

async function refusal(
  repository: SampleRepository,
  user: Pick<User, "id">,
  sample: Sample,
  role: Awaited<ReturnType<typeof sampleAccess>>["role"],
): Promise<ImportIssueCode | undefined> {
  if (role === null) return "sample_not_editable";
  if (sample.status !== "published") return "sample_not_published";
  if (isSyntheticMaterial(sample.material)) return "synthetic_sample";
  if (!canUpdateSample(role, sample)) return "sample_not_editable";
  const lock = await repository.getEditLock(sample.id);
  return lock && lock.userId !== user.id ? "sample_locked" : undefined;
}

export async function bulkEditTargets(
  repository: SampleRepository,
  users: UserRepository,
  user: Pick<User, "id" | "superAdmin">,
  numbers: number[],
): Promise<Map<number, BulkEditTarget>> {
  const found = await repository.listByInternalNumbers(numbers, user.id);
  // ponytail: reach and lock are one query each per row, capped at MAX_IMPORT_ROWS; batch them if uploads get slow.
  const targets = await Promise.all(
    found.map(async (entry) => {
      const { managed, role } = await sampleAccess(
        repository,
        users,
        user,
        entry,
      );
      const { sample } = entry;
      if (sample.status === "tombstone" && !managed) return [];
      const issue = await refusal(repository, user, sample, role);
      return [[sample.internalNumber!, { sample, issue }] as const];
    }),
  );
  return new Map(targets.flat());
}
