import type {
  ListSamplesParams,
  ListSamplesResult,
} from "@projet-igsn/domain/sample/repository";

import { numericAgeToAnnum } from "@projet-igsn/domain/sample/age/numeric-age-to-annum";
import { type SelectQueryBuilder, sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { withSampleChildren } from "./with-sample-children.ts";

// Case- and diacritic-insensitive match on name, specific_name and igsn.
// `search` is LIKE-escaped and bound as a parameter (never concatenated), and
// unaccent needs the migration-enabled Postgres extension.
// ponytail: seq scan (leading-wildcard ILIKE over unaccent() can't use a btree).
// Fine at registry scale; if the table grows, add pg_trgm GIN expression indexes
// on an IMMUTABLE unaccent() wrapper of each column.
function matchesSearch(search: string) {
  const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return sql<boolean>`(
    unaccent(name) ILIKE unaccent(${pattern})
    OR unaccent(specific_name) ILIKE unaccent(${pattern})
    OR unaccent(igsn) ILIKE unaccent(${pattern})
  )`;
}

// Rows whose generated geom intersects the drawn box, bound as parameters.
// ponytail: ST_MakeEnvelope does not wrap the antimeridian; a box crossing
// longitude 180 (west > east) is out of v1 scope and rejected by the domain
// schema, so it never reaches here. Split it client-side if it ever matters.
function withinBbox(bbox: NonNullable<ListSamplesParams["bbox"]>) {
  return sql<boolean>`ST_Intersects(
    geom,
    ST_MakeEnvelope(${bbox.west}, ${bbox.south}, ${bbox.east}, ${bbox.north}, 4326)::geography
  )`;
}

// The numeric age filter compares against the generated annum columns
// (numeric_age_*_a). A sample's age range overlaps the query range when its
// oldest bound is at least the query's youngest and its youngest bound is at
// most the query's oldest. GREATEST/LEAST pick the sample's oldest/youngest and
// ignore a null bound (a single-bound draft), so a row with no age never matches.
function applyFilters<O>(
  qb: SelectQueryBuilder<DB, "sample", O>,
  params: ListSamplesParams,
) {
  const { search, bbox } = params;
  const unit = params.ageUnit ?? "ma";
  const ageMinA =
    params.ageMin != null ? numericAgeToAnnum(params.ageMin, unit) : null;
  const ageMaxA =
    params.ageMax != null ? numericAgeToAnnum(params.ageMax, unit) : null;

  return qb
    .$if(search !== undefined, (q) => q.where(matchesSearch(search!)))
    .$if(bbox !== undefined, (q) => q.where(withinBbox(bbox!)))
    .$if(ageMinA != null, (q) =>
      q.where(
        sql<boolean>`GREATEST(numeric_age_min_a, numeric_age_max_a) >= ${ageMinA}`,
      ),
    )
    .$if(ageMaxA != null, (q) =>
      q.where(
        sql<boolean>`LEAST(numeric_age_min_a, numeric_age_max_a) <= ${ageMaxA}`,
      ),
    );
}

export async function listSamples(
  db: Transactional<DB>,
  params: ListSamplesParams,
  publishedOnly = false,
): Promise<ListSamplesResult> {
  const { page, perPage, sort, order = "asc" } = params;

  const rows = await applyFilters(
    db
      .selectFrom("sample")
      .selectAll()
      .$if(publishedOnly, (qb) => qb.where("published", "=", true)),
    params,
  )
    // Status is IGSN presence; last-modified stays as the tiebreak.
    .$if(sort === "status", (qb) => qb.orderBy(sql`igsn is not null`, order))
    .orderBy("updated_at", "desc")
    .orderBy("id", "desc")
    .limit(perPage)
    .offset((page - 1) * perPage)
    .execute();

  const { count } = await applyFilters(
    db
      .selectFrom("sample")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .$if(publishedOnly, (qb) => qb.where("published", "=", true)),
    params,
  ).executeTakeFirstOrThrow();

  return {
    data: await withSampleChildren(db, rows),
    total: Number(count),
  };
}
