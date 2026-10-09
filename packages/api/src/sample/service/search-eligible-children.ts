import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type { SearchEligibleParentsQuery } from "@projet-igsn/domain/sample/sample-validator";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";

import { PUBLIC_SAMPLE_STATUSES } from "@projet-igsn/domain/sample/publication/public-sample-statuses";
import { type ExpressionBuilder, expressionBuilder } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { moderatedSampleWhere } from "./moderated-sample-where.ts";
import {
  notVirtualSampleWhere,
  searchSamplePicker,
} from "./search-sample-picker.ts";

const seriesMembership = (eb: ExpressionBuilder<DB, "sample">) =>
  eb
    .selectFrom("sample_series_membership")
    .select("sample_series_membership.sample_id")
    .whereRef("sample_series_membership.sample_id", "=", "sample.id");

export function searchEligibleChildren(
  db: Transactional<DB>,
  { search, exclude }: SearchEligibleParentsQuery,
  userId: string,
  scope: ModerationScope | null,
): Promise<SampleParent[]> {
  const eb = expressionBuilder<DB, "sample">();
  return searchSamplePicker(db, search, [
    eb("status", "in", PUBLIC_SAMPLE_STATUSES),
    eb.or([
      eb.exists(
        eb
          .selectFrom("user_sample")
          .select("user_sample.user_id")
          .whereRef("user_sample.sample_id", "=", "sample.id")
          .where("user_sample.user_id", "=", userId)
          .where("user_sample.role", "in", ["owner", "editor"]),
      ),
      scope ? moderatedSampleWhere(scope) : eb.lit(false),
    ]),
    eb("is_sub_sample", "=", false),
    notVirtualSampleWhere,
    eb.not(
      eb.exists(
        seriesMembership(eb).where(
          "sample_series_membership.series_id",
          "is distinct from",
          exclude ?? null,
        ),
      ),
    ),
    ...(exclude === undefined ? [] : [eb("id", "<>", exclude)]),
  ]);
}
