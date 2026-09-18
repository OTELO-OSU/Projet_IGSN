import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type { SearchEligibleParentsQuery } from "@projet-igsn/domain/sample/sample-validator";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { Expression, SqlBool } from "kysely";

import { sampleParentSchema } from "@projet-igsn/domain/sample/parent/model";
import { expressionBuilder } from "kysely";
import { z } from "zod";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import { moderatedSampleWhere } from "./moderated-sample-where.ts";
import { applyFuzzyThreshold, searchFilters } from "./search-filter.ts";

const PARENT_SEARCH_LIMIT = 20;

function declarableWhere(
  userId: string,
  scope: ModerationScope | null,
): Expression<SqlBool> {
  const eb = expressionBuilder<DB, "sample">();
  const moderated = scope ? moderatedSampleWhere(scope) : eb.lit(false);
  return eb.or([
    eb("sample.status", "=", "published"),
    eb.and([
      eb("sample.status", "=", "withdrawn"),
      eb.or([
        eb.exists(
          eb
            .selectFrom("user_sample")
            .select("user_sample.user_id")
            .whereRef("user_sample.sample_id", "=", "sample.id")
            .where("user_sample.user_id", "=", userId),
        ),
        moderated,
      ]),
    ]),
    eb.and([eb("sample.status", "=", "tombstone"), moderated]),
  ]);
}

export function searchEligibleParents(
  db: Transactional<DB>,
  { search, exclude }: SearchEligibleParentsQuery,
  userId: string,
  scope: ModerationScope | null,
): Promise<SampleParent[]> {
  return withTransaction(db, async (trx) => {
    await applyFuzzyThreshold(trx, [search]);
    const rows = await trx
      .selectFrom("sample")
      .select(["id", "igsn", "name", "material"])
      .where((eb) =>
        eb.and([
          declarableWhere(userId, scope),
          ...(search === undefined ? [] : searchFilters(search)),
          ...(exclude === undefined ? [] : [eb("id", "<>", exclude)]),
        ]),
      )
      .orderBy("name")
      .limit(PARENT_SEARCH_LIMIT)
      .execute();
    return z.array(sampleParentSchema).parse(rows);
  });
}
