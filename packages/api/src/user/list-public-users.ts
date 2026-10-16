import type { PublicUser } from "@projet-igsn/domain/user/user-validator";
import type { Transaction } from "kysely";

import { publicUserSchema } from "@projet-igsn/domain/user/user-validator";

import type { DB } from "../db.ts";

export async function listPublicUsers(
  trx: Transaction<DB>,
  include?: string,
): Promise<PublicUser[]> {
  const rows = await trx
    .selectFrom("user")
    .select(["id", "name", "firstname"])
    .where("status", "=", "accepted")
    .where((eb) =>
      eb.or([
        eb.exists(
          eb
            .selectFrom("user_sample")
            .innerJoin("sample", "sample.id", "user_sample.sample_id")
            .select("sample.id")
            .where("sample.status", "=", "published")
            .whereRef("user_sample.user_id", "=", "user.id"),
        ),
        ...(include ? [eb("user.id", "=", include)] : []),
      ]),
    )
    .orderBy("name", "asc")
    .orderBy("firstname", "asc")
    .execute();
  return rows.map((row) => publicUserSchema.parse(row));
}
