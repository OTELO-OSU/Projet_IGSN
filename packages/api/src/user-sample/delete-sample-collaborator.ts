import type { RemoveCollaboratorResult } from "@projet-igsn/domain/user-sample/repository";

import type { DB } from "../db.ts";

import { releaseEditLock } from "../sample/service/release-edit-lock.ts";
import { type Transactional } from "../transaction.ts";

export async function deleteSampleCollaborator(
  db: Transactional<DB>,
  sampleId: string,
  userId: string,
): Promise<RemoveCollaboratorResult> {
  const removed = await db
    .deleteFrom("user_sample")
    .using("user")
    .whereRef("user.id", "=", "user_sample.user_id")
    .where("user_sample.sample_id", "=", sampleId)
    .where("user_sample.user_id", "=", userId)
    .where("user_sample.role", "!=", "owner")
    .returning(["user.email", "user.name", "user.firstname", "user.status"])
    .executeTakeFirst();
  if (!removed) return "not_found";
  await releaseEditLock(db, sampleId, userId);
  return { removed };
}
