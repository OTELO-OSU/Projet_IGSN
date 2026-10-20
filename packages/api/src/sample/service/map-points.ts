import type { SampleMapPointsQuery } from "@projet-igsn/domain/sample/map/model";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import { personFacetValues } from "./facet-filter.ts";
import { publishedScope, sampleFilters } from "./list-sample.ts";
import { applyFuzzyThreshold, forceCustomPlan } from "./search-filter.ts";

const COORDINATE_DECIMALS = 5;

export async function mapPublishedPointsJson(
  db: Transactional<DB>,
  query: SampleMapPointsQuery,
): Promise<string> {
  return withTransaction(db, async (trx) => {
    if (query.search !== undefined) await forceCustomPlan(trx);
    await applyFuzzyThreshold(trx, personFacetValues(query));
    await sql`set local paradedb.planner_warnings = off`.execute(trx);
    const filters = [...sampleFilters(query), ...publishedScope(query)];
    const located = trx
      .selectFrom("sample")
      .where((eb) => eb.and(filters))
      .where("location_geom", "is not", null)
      .select([
        "internal_number",
        sql`ST_PointOnSurface(location_geom)`.as("point"),
      ]);
    const coordinate = (axis: "ST_X" | "ST_Y") =>
      sql<number>`round(${sql.raw(axis)}(point)::numeric, ${sql.lit(COORDINATE_DECIMALS)})::float8`;
    const { json } = await trx
      .selectFrom(located.as("located"))
      .select(
        sql<string>`json_build_object('data', json_build_object(
          'numbers', coalesce(array_agg(internal_number), '{}'),
          'longitudes', coalesce(array_agg(${coordinate("ST_X")}), '{}'),
          'latitudes', coalesce(array_agg(${coordinate("ST_Y")}), '{}')
        ))::text`.as("json"),
      )
      .executeTakeFirstOrThrow();
    return json;
  });
}
