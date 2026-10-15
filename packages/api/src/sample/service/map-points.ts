import type {
  SampleMapPointsQuery,
  SampleMapPointsResponse,
} from "@projet-igsn/domain/sample/map/model";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import { personFacetValues } from "./facet-filter.ts";
import { publishedScope, sampleFilters } from "./list-sample.ts";
import {
  applyFuzzyThreshold,
  forceCustomPlan,
  publicSearchFilters,
} from "./search-filter.ts";

const COORDINATE_DECIMALS = 5;

export async function mapPublishedPoints(
  db: Transactional<DB>,
  query: SampleMapPointsQuery,
): Promise<SampleMapPointsResponse> {
  return withTransaction(db, async (trx) => {
    if (query.search !== undefined) await forceCustomPlan(trx);
    await applyFuzzyThreshold(trx, personFacetValues(query));
    const filters = [
      ...sampleFilters(query, undefined, publicSearchFilters),
      ...publishedScope(query),
    ];
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
    const rows = await trx
      .selectFrom(located.as("located"))
      .select([
        "internal_number",
        coordinate("ST_X").as("longitude"),
        coordinate("ST_Y").as("latitude"),
      ])
      .$narrowType<{ internal_number: number }>()
      .execute();
    return {
      data: {
        numbers: rows.map(({ internal_number }) => internal_number),
        longitudes: rows.map(({ longitude }) => longitude),
        latitudes: rows.map(({ latitude }) => latitude),
      },
    };
  });
}
