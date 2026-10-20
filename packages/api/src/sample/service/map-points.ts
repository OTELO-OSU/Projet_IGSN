import type { SampleMapPointsQuery } from "@projet-igsn/domain/sample/map/model";

import { type RawBuilder, sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import { personFacetValues } from "./facet-filter.ts";
import { publishedScope, sampleFilters } from "./list-sample.ts";
import {
  applyFuzzyThreshold,
  forceCustomPlan,
  searchFilters,
  serviceSearchFilters,
} from "./search-filter.ts";

const COORDINATE_DECIMALS = 5;

const coordinate = (axis: "ST_X" | "ST_Y") =>
  sql<number>`round(${sql.raw(axis)}(point)::numeric, ${sql.lit(COORDINATE_DECIMALS)})::float8`;

function locatedSamplesJson(
  db: Transactional<DB>,
  query: SampleMapPointsQuery,
  searchBuilder: typeof searchFilters,
  json: RawBuilder<string>,
): Promise<string> {
  return withTransaction(db, async (trx) => {
    if (query.search !== undefined) await forceCustomPlan(trx);
    await applyFuzzyThreshold(trx, personFacetValues(query));
    await sql`set local paradedb.planner_warnings = off`.execute(trx);
    const filters = [
      ...sampleFilters(query, undefined, searchBuilder),
      ...publishedScope(query),
    ];
    const located = trx
      .selectFrom("sample")
      .where((eb) => eb.and(filters))
      .where("location_geom", "is not", null)
      .select([
        "internal_number",
        "igsn",
        "name",
        sql`ST_PointOnSurface(location_geom)`.as("point"),
      ]);
    const row = await trx
      .selectFrom(located.as("located"))
      .select(json.as("json"))
      .executeTakeFirstOrThrow();
    return row.json;
  });
}

export function mapPublishedPointsJson(
  db: Transactional<DB>,
  query: SampleMapPointsQuery,
): Promise<string> {
  return locatedSamplesJson(
    db,
    query,
    searchFilters,
    sql<string>`json_build_object('data', json_build_object(
      'numbers', coalesce(array_agg(internal_number), '{}'),
      'longitudes', coalesce(array_agg(${coordinate("ST_X")}), '{}'),
      'latitudes', coalesce(array_agg(${coordinate("ST_Y")}), '{}')
    ))::text`,
  );
}

export function mapPublishedFeaturesJson(
  db: Transactional<DB>,
  query: SampleMapPointsQuery,
): Promise<string> {
  return locatedSamplesJson(
    db,
    query,
    serviceSearchFilters,
    sql<string>`json_build_object('type', 'FeatureCollection', 'features', coalesce(json_agg(json_build_object(
      'type', 'Feature',
      'geometry', json_build_object('type', 'Point', 'coordinates', json_build_array(${coordinate("ST_X")}, ${coordinate("ST_Y")})),
      'properties', json_build_object('igsn', igsn, 'name', name)
    )), '[]'::json))::text`,
  );
}
