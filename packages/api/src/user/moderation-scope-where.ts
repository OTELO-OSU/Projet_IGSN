import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { Expression, ExpressionBuilder, SqlBool } from "kysely";

import type { DB } from "../db.ts";

export function moderationScopeWhere(
  eb: ExpressionBuilder<DB, "user">,
  scope: ModerationScope,
): Expression<SqlBool>[] {
  if (scope.superAdmin) return [];
  const { callerId, managedLaboratories } = scope;

  return [
    managedLaboratories.length > 0
      ? eb("institutional_laboratory", "in", managedLaboratories)
      : eb.lit(false),
    eb("id", "!=", callerId),
    eb("super_admin", "=", false),
  ];
}
