import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { Expression } from "kysely";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export function attachableManualGroups(
  trx: Transactional<DB>,
  userId: Expression<string> | string,
): Promise<ManualGroup[]> {
  return trx
    .selectFrom("manual_group")
    .select(["id", "name"])
    .where((eb) =>
      eb.or([
        eb.exists(
          eb
            .selectFrom("manual_group_member")
            .select("manual_group_member.user_id")
            .whereRef("manual_group_member.group_id", "=", "manual_group.id")
            .where("manual_group_member.user_id", "=", userId),
        ),
        eb.exists(
          eb
            .selectFrom("user_managed_manual_group")
            .select("user_managed_manual_group.user_id")
            .whereRef(
              "user_managed_manual_group.group_id",
              "=",
              "manual_group.id",
            )
            .where("user_managed_manual_group.user_id", "=", userId),
        ),
      ]),
    )
    .orderBy("name", "asc")
    .execute();
}

export function sampleOwnerId(
  trx: Transactional<DB>,
  sampleId: string,
): Expression<string> {
  return trx
    .selectFrom("user_sample")
    .select("user_sample.user_id")
    .where("user_sample.sample_id", "=", sampleId)
    .where("user_sample.role", "=", "owner")
    .$asScalar();
}
