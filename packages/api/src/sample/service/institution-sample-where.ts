import type { Expression, SqlBool } from "kysely";

import { institutionLaboratoryCodes } from "@projet-igsn/domain/institutional-group/institution-laboratory-codes";
import { expressionBuilder } from "kysely";

import type { DB } from "../../db.ts";

export function institutionSampleWhere(filter: string): Expression<SqlBool> {
  const eb = expressionBuilder<DB, "sample">();
  const codes = institutionLaboratoryCodes(filter);
  return codes.length > 0
    ? eb("sample.institutional_laboratory", "in", codes)
    : eb.lit(false);
}
