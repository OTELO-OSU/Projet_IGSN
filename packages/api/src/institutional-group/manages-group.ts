import type { Expression, SqlBool } from "kysely";

import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { laboratoryCodesWithSuccessors } from "@projet-igsn/domain/institutional-group/laboratory-codes-with-successors";
import { expressionBuilder } from "kysely";

import type { DB } from "../db.ts";

import { laboratoryIdsOf } from "./stored-institution.ts";

const REPLACED_LABORATORIES = LABORATORIES.filter(
  ({ replacedBy }) => replacedBy !== undefined,
).map(({ id, code }) => ({
  id,
  successorIds: laboratoryIdsOf(laboratoryCodesWithSuccessors(code)),
}));

export function managesGroup(
  groupCode: Expression<string | null>,
): Expression<SqlBool> {
  const eb = expressionBuilder<
    { manager: DB["user_managed_institutional_group"] },
    "manager"
  >();
  return eb.or([
    eb("manager.code", "=", groupCode),
    ...REPLACED_LABORATORIES.map(({ id, successorIds }) =>
      eb.and([
        eb("manager.kind", "=", "laboratory"),
        eb(groupCode, "=", id),
        eb("manager.code", "in", successorIds),
      ]),
    ),
  ]);
}
