import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { Expression, ExpressionBuilder, SqlBool } from "kysely";

import type { DB } from "../db.ts";

export function moderationScopeWhere(
  eb: ExpressionBuilder<DB, "user">,
  scope: ModerationScope,
): Expression<SqlBool>[] {
  if (scope.superAdmin) return [];
  const { callerId, managedLaboratories, managedManualGroupIds } = scope;
  const reach: Expression<SqlBool>[] = [];
  if (managedLaboratories.length > 0) {
    reach.push(eb("institutional_laboratory", "in", managedLaboratories));
  }
  if (managedManualGroupIds.length > 0) {
    reach.push(
      eb.exists(
        eb
          .selectFrom("manual_group_member")
          .select("group_id")
          .whereRef("manual_group_member.user_id", "=", "user.id")
          .where("group_id", "in", managedManualGroupIds),
      ),
    );
  }

  return [
    reach.length > 0 ? eb.or(reach) : eb.lit(false),
    eb("id", "!=", callerId),
    eb("super_admin", "=", false),
  ];
}
