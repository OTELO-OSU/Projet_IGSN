import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { Expression, SqlBool } from "kysely";

import { expressionBuilder } from "kysely";

import type { DB } from "../../db.ts";

export function moderatedSampleWhere(
  scope: ModerationScope,
): Expression<SqlBool> {
  const eb = expressionBuilder<DB, "sample">();
  if (scope.superAdmin) {
    return eb.lit(true);
  }
  const reach: Expression<SqlBool>[] = [];
  if (scope.managedLaboratories.length > 0) {
    reach.push(
      eb("sample.institutional_laboratory", "in", scope.managedLaboratories),
    );
  }
  if (scope.managedManualGroupIds.length > 0) {
    reach.push(
      eb.exists(
        eb
          .selectFrom("sample_manual_group")
          .select("group_id")
          .whereRef("sample_manual_group.sample_id", "=", "sample.id")
          .where("group_id", "in", scope.managedManualGroupIds),
      ),
    );
  }
  return reach.length > 0 ? eb.or(reach) : eb.lit(false);
}
