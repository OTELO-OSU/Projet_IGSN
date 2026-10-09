import type { SeriesLinkCandidate } from "@projet-igsn/domain/sample/repository";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";

import { PUBLIC_SAMPLE_STATUSES } from "@projet-igsn/domain/sample/publication/public-sample-statuses";
import { sql, type SqlBool } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { moderatedSampleWhere } from "./moderated-sample-where.ts";

const selectSeriesLinkCandidates = (
  db: Transactional<DB>,
  userId: string | null,
  scope: ModerationScope | null,
) =>
  db
    .selectFrom("sample")
    .leftJoin(
      "sample_series_membership",
      "sample_series_membership.sample_id",
      "sample.id",
    )
    .leftJoin("user_sample", (join) =>
      join
        .onRef("user_sample.sample_id", "=", "sample.id")
        .on("user_sample.user_id", "=", userId),
    )
    .select([
      "sample.id",
      "sample.igsn",
      "sample.type",
      "sample.status",
      "sample.is_sub_sample as isSubSample",
      "sample_series_membership.series_id as seriesId",
      "user_sample.role",
      sql<boolean>`${
        scope ? moderatedSampleWhere(scope) : sql<SqlBool>`false`
      }`.as("moderated"),
    ]);

export async function listSeriesLinkCandidates(
  db: Transactional<DB>,
  ids: string[],
  userId: string | null,
  scope: ModerationScope | null,
): Promise<ReadonlyMap<string, SeriesLinkCandidate>> {
  if (ids.length === 0) return new Map();
  const rows = await selectSeriesLinkCandidates(db, userId, scope)
    .where("sample.id", "in", ids)
    .execute();
  return new Map(rows.map((row) => [row.id, row]));
}

export async function listPublicSeriesLinkCandidatesByIgsns(
  db: Transactional<DB>,
  igsns: string[],
  userId: string | null,
  scope: ModerationScope | null,
): Promise<ReadonlyMap<string, SeriesLinkCandidate>> {
  if (igsns.length === 0) return new Map();
  const rows = await selectSeriesLinkCandidates(db, userId, scope)
    .where("sample.igsn", "in", igsns)
    .where("sample.status", "in", PUBLIC_SAMPLE_STATUSES)
    .execute();
  return new Map(
    rows.flatMap((row): [string, SeriesLinkCandidate][] =>
      row.igsn === null ? [] : [[row.igsn, row]],
    ),
  );
}
