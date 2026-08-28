import type { OrphanedGroup } from "@projet-igsn/domain/user/orphaned-group";
import type { Transaction } from "kysely";

import type { DB } from "../db.ts";

import { institutionalGroupLabel } from "../institutional-group/institutional-group-label.ts";

export async function orphanedGroupsOfUser(
  trx: Transaction<DB>,
  userId: string,
): Promise<OrphanedGroup[]> {
  const manual = await trx
    .selectFrom("user_managed_manual_group")
    .innerJoin(
      "manual_group",
      "manual_group.id",
      "user_managed_manual_group.group_id",
    )
    .select(["manual_group.id", "manual_group.name"])
    .where("user_managed_manual_group.user_id", "=", userId)
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom("user_managed_manual_group as manager")
            .innerJoin("user as active", "active.id", "manager.user_id")
            .select("manager.group_id")
            .whereRef("manager.group_id", "=", "manual_group.id")
            .where("active.status", "=", "accepted"),
        ),
      ),
    )
    .orderBy("manual_group.name", "asc")
    .execute();

  const institutional = await trx
    .selectFrom("user_managed_institutional_group")
    .select(["kind", "code"])
    .where("user_id", "=", userId)
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom("user_managed_institutional_group as manager")
            .innerJoin("user as active", "active.id", "manager.user_id")
            .select("manager.code")
            .whereRef(
              "manager.kind",
              "=",
              "user_managed_institutional_group.kind",
            )
            .whereRef(
              "manager.code",
              "=",
              "user_managed_institutional_group.code",
            )
            .where("active.status", "=", "accepted"),
        ),
      ),
    )
    .orderBy("kind", "asc")
    .orderBy("code", "asc")
    .execute();

  return [
    ...manual.map(
      ({ id, name }): OrphanedGroup => ({ kind: "manual", id, name }),
    ),
    ...institutional.map(
      (ref): OrphanedGroup => ({ ...ref, name: institutionalGroupLabel(ref) }),
    ),
  ];
}
