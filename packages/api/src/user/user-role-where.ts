import type { UserRole } from "@projet-igsn/domain/user/model";
import type { Expression, ExpressionBuilder, SqlBool } from "kysely";

import type { DB } from "../db.ts";

// ponytail: a managed code a catalog regeneration dropped still counts here; filter on the known catalog codes if one ever misleads.
const managesAGroup = (eb: ExpressionBuilder<DB, "user">) =>
  eb.or([
    eb.exists(
      eb
        .selectFrom("user_managed_institutional_group")
        .select("user_managed_institutional_group.user_id")
        .whereRef("user_managed_institutional_group.user_id", "=", "user.id"),
    ),
    eb.exists(
      eb
        .selectFrom("user_managed_manual_group")
        .select("user_managed_manual_group.user_id")
        .whereRef("user_managed_manual_group.user_id", "=", "user.id"),
    ),
  ]);

export function userRoleWhere(
  eb: ExpressionBuilder<DB, "user">,
  role: UserRole,
): Expression<SqlBool> {
  switch (role) {
    case "super_admin":
      return eb("user.super_admin", "=", true);
    case "space_manager":
      return eb.and([eb("user.super_admin", "=", false), managesAGroup(eb)]);
    case "regular":
      return eb.and([
        eb("user.super_admin", "=", false),
        eb.not(managesAGroup(eb)),
      ]);
  }
}
