import type { SetInstitutionalGroups } from "@projet-igsn/domain/institutional-group/institutional-groups-validator";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { Transaction } from "kysely";

import { sql } from "kysely";

import type { DB } from "../db.ts";

import { storedInstitutions } from "../institutional-group/stored-institution.ts";
import { orphanedGroupsOnLeavingAccepted } from "./orphaned-groups-of-user.ts";

export async function setUserInstitutionalGroups(
  trx: Transaction<DB>,
  userId: string,
  submitted: SetInstitutionalGroups,
): ReturnType<UserRepository["setInstitutionalGroups"]> {
  const groups = storedInstitutions({
    ...submitted,
    institutionalOsu: submitted.institutionalOsu ?? null,
  });
  const osu = groups.institutionalOsu;
  const previous = await trx
    .selectFrom("user")
    .select("status")
    .where("id", "=", userId)
    .forUpdate()
    .executeTakeFirst();
  const updated = await trx
    .updateTable("user")
    .set((eb) => ({
      institutional_organization: groups.institutionalOrganization,
      institutional_osu: osu,
      institutional_laboratory: groups.institutionalLaboratory,
      status: eb
        .case()
        .when("super_admin", "=", true)
        .then(eb.ref("status"))
        .when("institutional_organization", "is", null)
        .then(eb.ref("status"))
        .else("pending" as const)
        .end(),
    }))
    .where("id", "=", userId)
    .where(
      sql`(institutional_organization, institutional_osu, institutional_laboratory)`,
      "is distinct from",
      sql`(${groups.institutionalOrganization}, ${osu}, ${groups.institutionalLaboratory})`,
    )
    .returning("status")
    .executeTakeFirst();
  return {
    orphanedGroups:
      previous && updated
        ? await orphanedGroupsOnLeavingAccepted(
            trx,
            userId,
            previous.status,
            updated.status,
          )
        : [],
  };
}
