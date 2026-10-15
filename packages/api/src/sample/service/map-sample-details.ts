import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { SampleMapDetailsResponse } from "@projet-igsn/domain/sample/map/model";

import { sql } from "kysely";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

type Position = NonNullable<Location["position"]>;

export async function mapPublishedDetails(
  db: Transactional<DB>,
  numbers: number[],
): Promise<SampleMapDetailsResponse> {
  const rows = await db
    .selectFrom("sample")
    .leftJoin("location", "location.id", "sample.location_id")
    .where("sample.status", "=", "published")
    .where("sample.internal_number", "in", numbers)
    .select([
      "sample.internal_number as internalNumber",
      "sample.igsn",
      "sample.name",
      sql<Position | null>`case
        when location.area_west_longitude is not null then json_build_object(
          'type', 'area',
          'westLongitude', location.area_west_longitude,
          'southLatitude', location.area_south_latitude,
          'eastLongitude', location.area_east_longitude,
          'northLatitude', location.area_north_latitude)
        when location.line_start_longitude is not null then json_build_object(
          'type', 'line',
          'startLongitude', location.line_start_longitude,
          'startLatitude', location.line_start_latitude,
          'endLongitude', location.line_end_longitude,
          'endLatitude', location.line_end_latitude)
      end`.as("position"),
    ])
    .$narrowType<{ internalNumber: number; igsn: string }>()
    .execute();
  return {
    data: rows.map(({ position, ...detail }) =>
      position ? { ...detail, position } : detail,
    ),
  };
}
