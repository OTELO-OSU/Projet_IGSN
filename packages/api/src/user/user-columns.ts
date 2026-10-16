import type { ManagedGroups } from "@projet-igsn/domain/user/managed-groups";
import type { ExpressionBuilder } from "kysely";

import { adminUserSchema } from "@projet-igsn/domain/user/user-validator";
import { jsonArrayFrom } from "kysely/helpers/postgres";

import type { DB } from "../db.ts";

import { institutionCodes } from "../institutional-group/stored-institution.ts";
import {
  knownManagedGroupCodes,
  managedGroupsOf,
  USER_MANAGED_GROUP_TABLES,
} from "../managed-groups.ts";
import { canDetachFromGroup } from "../manual-group/can-detach-from-group.ts";

export const USER_COLUMNS = [
  "id",
  "email",
  "name",
  "firstname",
  "orcid",
  "status",
  "super_admin as superAdmin",
  "institutional_organization as institutionalOrganization",
  "institutional_osu as institutionalOsu",
  "institutional_laboratory as institutionalLaboratory",
] as const;

export const userManualGroups = (eb: ExpressionBuilder<DB, "user">) =>
  jsonArrayFrom(
    eb
      .selectFrom("manual_group")
      .innerJoin(
        "manual_group_member",
        "manual_group_member.group_id",
        "manual_group.id",
      )
      .select((inner) => [
        "manual_group.id",
        "manual_group.name",
        canDetachFromGroup(eb.ref("user.id"), inner.ref("manual_group.id")).as(
          "canDetach",
        ),
      ])
      .whereRef("manual_group_member.user_id", "=", "user.id")
      .orderBy("manual_group.name", "asc"),
  ).as("manualGroups");

export const userManagedGroups = managedGroupsOf(
  USER_MANAGED_GROUP_TABLES,
  "user.id",
);

export const toAdminUser = (
  row: Parameters<typeof institutionCodes>[0] & {
    managedGroups: ManagedGroups;
  },
) =>
  adminUserSchema.parse({
    ...institutionCodes(row),
    managedGroups: knownManagedGroupCodes(row.managedGroups),
  });
