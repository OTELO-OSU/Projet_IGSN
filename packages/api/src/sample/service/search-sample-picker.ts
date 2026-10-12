import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { Expression } from "kysely";

import { sampleParentSchema } from "@projet-igsn/domain/sample/parent/model";
import { VIRTUAL_SAMPLE_TYPE_ROOT } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { expressionBuilder, sql, type SqlBool } from "kysely";
import { z } from "zod";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import { moderatedSampleWhere } from "./moderated-sample-where.ts";
import { forceCustomPlan, searchFilters } from "./search-filter.ts";

const PICKER_SEARCH_LIMIT = 20;

export const virtualSampleWhere = sql<SqlBool>`coalesce(sample.type <@ ${VIRTUAL_SAMPLE_TYPE_ROOT}::ltree, false)`;

export const notVirtualSampleWhere = sql<SqlBool>`not ${virtualSampleWhere}`;

export function editableSampleWhere(
  userId: string,
  scope: ModerationScope | null,
): Expression<SqlBool> {
  const eb = expressionBuilder<DB, "sample">();
  return eb.or([
    eb.exists(
      eb
        .selectFrom("user_sample")
        .select("user_sample.user_id")
        .whereRef("user_sample.sample_id", "=", "sample.id")
        .where("user_sample.user_id", "=", userId)
        .where("user_sample.role", "in", ["owner", "editor"]),
    ),
    scope ? moderatedSampleWhere(scope) : eb.lit(false),
  ]);
}

export async function searchSamplePicker(
  db: Transactional<DB>,
  search: string | undefined,
  where: Expression<SqlBool>[],
): Promise<SampleParent[]> {
  const rows = await withTransaction(db, async (trx) => {
    if (search !== undefined) await forceCustomPlan(trx);
    return trx
      .selectFrom("sample")
      .select(["id", "igsn", "name", "material"])
      .where((eb) =>
        eb.and([
          ...where,
          ...(search === undefined ? [] : searchFilters(search)),
        ]),
      )
      .orderBy("name")
      .limit(PICKER_SEARCH_LIMIT)
      .execute();
  });
  return z.array(sampleParentSchema).parse(rows);
}
