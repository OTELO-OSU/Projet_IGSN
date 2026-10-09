import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type { SearchEligibleParentsQuery } from "@projet-igsn/domain/sample/sample-validator";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { Expression, SqlBool } from "kysely";

import { REDACTED_SAMPLE_STATUSES } from "@projet-igsn/domain/sample/publication/public-sample-statuses";
import { expressionBuilder } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { moderatedSampleWhere } from "./moderated-sample-where.ts";
import {
  notVirtualSampleWhere,
  searchSamplePicker,
} from "./search-sample-picker.ts";

function declarableWhere(
  userId: string,
  scope: ModerationScope | null,
): Expression<SqlBool> {
  const eb = expressionBuilder<DB, "sample">();
  const moderated = scope ? moderatedSampleWhere(scope) : eb.lit(false);
  const statusWhere = eb.or([
    eb("sample.status", "=", "published"),
    eb.and([
      eb("sample.status", "in", REDACTED_SAMPLE_STATUSES),
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
  return eb.and([statusWhere, notVirtualSampleWhere]);
}

export function searchEligibleParents(
  db: Transactional<DB>,
  { search, exclude }: SearchEligibleParentsQuery,
  userId: string,
  scope: ModerationScope | null,
): Promise<SampleParent[]> {
  const eb = expressionBuilder<DB, "sample">();
  return searchSamplePicker(db, search, [
    declarableWhere(userId, scope),
    ...(exclude === undefined ? [] : [eb("id", "<>", exclude)]),
  ]);
}
