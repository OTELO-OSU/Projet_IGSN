import type { AddCollaboratorResult } from "@projet-igsn/domain/user-sample/repository";
import type { CollaboratorRole } from "@projet-igsn/domain/user-sample/user-sample-validator";

import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export async function insertSampleCollaborator(
  db: Transactional<DB>,
  sampleId: string,
  userId: string,
  role: CollaboratorRole,
  { mayChangeRole = false } = {},
): Promise<AddCollaboratorResult> {
  const found = await db
    .selectFrom("user")
    .leftJoin("user_sample", (join) =>
      join
        .onRef("user_sample.user_id", "=", "user.id")
        .on("user_sample.sample_id", "=", sampleId),
    )
    .select([
      "user.email",
      "user.name",
      "user.firstname",
      "user.status",
      "user_sample.role as currentRole",
    ])
    .where("user.id", "=", userId)
    .executeTakeFirst();
  if (!found) {
    throw new HTTPException(404, { message: "User not found" });
  }
  const { currentRole, status, ...user } = found;
  if (status === "rejected") {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  if (currentRole === "owner" || currentRole === role) {
    return "already_collaborator";
  }
  if (currentRole && !mayChangeRole) {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  await db
    .insertInto("user_sample")
    .values({ sample_id: sampleId, user_id: userId, role })
    .onConflict((oc) =>
      oc.columns(["user_id", "sample_id"]).doUpdateSet({ role }),
    )
    .execute();
  return { added: user };
}
