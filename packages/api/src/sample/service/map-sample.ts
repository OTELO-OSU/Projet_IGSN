import type { Location } from "@projet-igsn/domain/sample/location/model";
import type {
  SampleMapCluster,
  SampleMapQuery,
  SampleMapResponse,
} from "@projet-igsn/domain/sample/map/model";

import { splitBbox } from "@projet-igsn/domain/sample/split-bbox";
import { type RawBuilder, sql, type SqlBool } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import { personFacetValues } from "./facet-filter.ts";
import { publishedScope, sampleFilters } from "./list-sample.ts";
import { applyFuzzyThreshold } from "./search-filter.ts";

const MARKER_PX = 60;
const TILE_PX = 256;
const MAX_CLUSTERS_PER_SIDE = 64;

type Position = NonNullable<Location["position"]>;
type MapSample = NonNullable<SampleMapCluster["sample"]>;
type Extent = NonNullable<SampleMapResponse["meta"]["extent"]>;

const extentOf = (geom: RawBuilder<unknown>) =>
  sql<Extent | null>`case when ST_Extent(${geom}) is null then null else json_build_object(
    'west', ST_XMin(ST_Extent(${geom})),
    'south', ST_YMin(ST_Extent(${geom})),
    'east', ST_XMax(ST_Extent(${geom})),
    'north', ST_YMax(ST_Extent(${geom}))
  ) end`;

export async function mapPublishedSamples(
  db: Transactional<DB>,
  query: SampleMapQuery,
): Promise<SampleMapResponse> {
  return withTransaction(db, async (trx) => {
    await applyFuzzyThreshold(trx, [query.search, ...personFacetValues(query)]);
    const filters = [
      ...sampleFilters({ ...query, viewport: undefined }),
      ...publishedScope(query),
    ];
    const located = trx
      .with("matching", (qb) =>
        qb
          .selectFrom("sample")
          .select(["igsn", "name", "material", "location_id"])
          .where((eb) => eb.and(filters)),
      )
      .selectFrom("matching")
      .innerJoin("location", "location.id", "matching.location_id")
      .where("location.geom", "is not", null);

    const envelopes = splitBbox(query.viewport);
    const viewport = sql`ST_Collect(ARRAY[${sql.join(
      envelopes.map(
        ({ west, south, east, north }) =>
          sql`ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)`,
      ),
    )}])`;
    // ponytail: degree grid, Mercator distortion at high latitudes; ST_Transform 3857 if it bothers anyone
    const span = Math.max(
      envelopes.reduce((sum, { west, east }) => sum + east - west, 0),
      query.viewport.north - query.viewport.south,
    );
    const cell = Math.max(
      (360 / 2 ** query.zoom) * (MARKER_PX / TILE_PX),
      span / MAX_CLUSTERS_PER_SIDE,
    );

    const clusters = await trx
      .selectFrom(
        located
          .where(sql<SqlBool>`ST_Intersects(location.geom, ${viewport})`)
          .select([
            "matching.igsn",
            "matching.name",
            "matching.material",
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
            sql<string>`case when ST_GeometryType(location.geom) = 'ST_Point' then location.geom else ST_Centroid(ST_Intersection(location.geom, ${viewport})) end`.as(
              "p",
            ),
          ])
          .as("visible"),
      )
      .select([
        sql<number>`count(*)::int`.as("count"),
        sql<number>`ST_X(ST_Centroid(ST_Collect(p)))`.as("longitude"),
        sql<number>`ST_Y(ST_Centroid(ST_Collect(p)))`.as("latitude"),
        extentOf(sql`p`)
          .$castTo<Extent>()
          .as("extent"),
        sql<
          (Omit<MapSample, "position"> & { position: Position | null }) | null
        >`case when count(*) = 1 then (array_agg(json_build_object('igsn', igsn, 'name', name, 'material', material, 'position', position)))[1] end`.as(
          "sample",
        ),
      ])
      .groupBy(sql`ST_SnapToGrid(p, ${cell})`)
      .execute();

    const { extent } = await located
      .select(extentOf(sql`location.geom`).as("extent"))
      .executeTakeFirstOrThrow();

    return {
      data: clusters.map(({ sample, ...cluster }) => {
        if (!sample) return cluster;
        const { position, ...rest } = sample;
        return { ...cluster, sample: position ? { ...rest, position } : rest };
      }),
      meta: { extent },
    };
  });
}
