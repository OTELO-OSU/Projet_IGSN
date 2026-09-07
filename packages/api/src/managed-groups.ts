import type { ManagedGroups } from "@projet-igsn/domain/user/managed-groups";
import type { Transaction } from "kysely";

import { MANAGED_GROUP_KINDS } from "@projet-igsn/domain/user/managed-groups";
import { sql } from "kysely";
import { jsonBuildObject } from "kysely/helpers/postgres";

import type { DB } from "./db.ts";

import { assertManualGroupsExist } from "./manual-group/manual-groups-by-ids.ts";

type ManagedGroupTables = {
  institutional:
    | "user_managed_institutional_group"
    | "service_account_managed_institutional_group";
  manual: "user_managed_manual_group" | "service_account_managed_manual_group";
  owner: "user_id" | "service_account_id";
};

export const USER_MANAGED_GROUP_TABLES: ManagedGroupTables = {
  institutional: "user_managed_institutional_group",
  manual: "user_managed_manual_group",
  owner: "user_id",
};

export const SERVICE_ACCOUNT_MANAGED_GROUP_TABLES: ManagedGroupTables = {
  institutional: "service_account_managed_institutional_group",
  manual: "service_account_managed_manual_group",
  owner: "service_account_id",
};

export const managedGroupsOf = (
  tables: ManagedGroupTables,
  ownerRef: string,
) => {
  const owner = sql.ref(`${tables.institutional}.${tables.owner}`);
  const codes = (kind: DB[ManagedGroupTables["institutional"]]["kind"]) =>
    sql<string[]>`coalesce((
      select array_agg(code order by code)
        from ${sql.table(tables.institutional)}
       where ${owner} = ${sql.ref(ownerRef)}
         and kind = ${kind}
    ), '{}')`;
  return jsonBuildObject({
    organizations: codes("organization"),
    osus: codes("osu"),
    laboratories: codes("laboratory"),
    manualGroupIds: sql<string[]>`coalesce((
      select array_agg(group_id order by group_id)
        from ${sql.table(tables.manual)}
       where ${sql.ref(`${tables.manual}.${tables.owner}`)} = ${sql.ref(ownerRef)}
    ), '{}')`,
  }).as("managedGroups");
};

export async function replaceManagedGroups(
  trx: Transaction<DB>,
  tables: ManagedGroupTables,
  ownerId: string,
  groups: ManagedGroups,
): Promise<void> {
  await assertManualGroupsExist(trx, groups.manualGroupIds);
  const owner = sql.ref(tables.owner);
  const institutional = sql.table(tables.institutional);
  const manual = sql.table(tables.manual);
  const codeRows = MANAGED_GROUP_KINDS.flatMap(([key, kind]) =>
    groups[key].map((code) => sql`(${ownerId}, ${kind}, ${code})`),
  );
  const groupRows = groups.manualGroupIds.map(
    (groupId) => sql`(${ownerId}, ${groupId})`,
  );
  await sql`delete from ${institutional} where ${owner} = ${ownerId}`.execute(
    trx,
  );
  await sql`delete from ${manual} where ${owner} = ${ownerId}`.execute(trx);
  if (codeRows.length > 0) {
    await sql`insert into ${institutional} (${owner}, kind, code) values ${sql.join(codeRows)}`.execute(
      trx,
    );
  }
  if (groupRows.length > 0) {
    await sql`insert into ${manual} (${owner}, group_id) values ${sql.join(groupRows)}`.execute(
      trx,
    );
  }
}
