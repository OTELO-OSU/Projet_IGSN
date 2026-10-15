import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { SampleMapPointsQuery } from "@projet-igsn/domain/sample/map/model";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { sql } from "kysely";
import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { mapPublishedPoints } from "./map-points.ts";
import { publishSample } from "./publish-sample.ts";

type Position = NonNullable<Location["position"]>;

const point = (longitude: number, latitude: number): Position => ({
  type: "point",
  longitude,
  latitude,
});

async function insertPublished(
  db: Transactional<DB>,
  name: string,
  position: Position | null,
  extra: Partial<CreateSample> = {},
): Promise<Sample> {
  const { id } = await insertSample(db, {
    name,
    nature: "powder",
    type: null,
    collectionMethod: null,
    material: "rock_and_sediment.sediment",
    ...(position ? { location: { position } } : {}),
    ...extra,
  });
  const published = await publishSample(db, id);
  if (!published) throw new Error(`${name} vanished`);
  return published;
}

async function setStatus(
  db: Transactional<DB>,
  sample: Sample,
  status: Sample["status"],
) {
  await db
    .updateTable("sample")
    .set({ status })
    .where("id", "=", sample.id)
    .execute();
}

async function pointsOf(
  db: Transactional<DB>,
  query: SampleMapPointsQuery = {},
) {
  const { data } = await mapPublishedPoints(db, query);
  return data.numbers
    .map((number, index) => ({
      number,
      longitude: data.longitudes[index],
      latitude: data.latitudes[index],
    }))
    .toSorted((left, right) => left.number - right.number);
}

describe("mapPublishedPoints", () => {
  pgTest(
    "should return every published, located, matching sample as rounded columns",
    async ({ db }) => {
      // Arrange
      const a = await insertPublished(
        db,
        "Grès A",
        point(5.123456789, 45.987654321),
      );
      const b = await insertPublished(db, "Grès B", point(-120, -30));
      await insertPublished(db, "Grès unlocated", null);
      await insertPublished(db, "Basalte", point(1, 1));
      await insertPublished(db, "Grès thin", point(2, 2), {
        nature: "thin_section",
      });
      for (const status of ["draft", "withdrawn", "embargo"] as const)
        await setStatus(
          db,
          await insertPublished(db, `Grès ${status}`, point(3, 3)),
          status,
        );
      // Act
      const points = await pointsOf(db, { search: "gres", nature: "powder" });
      // Assert
      expect(points).toEqual(
        [
          { number: a.internalNumber, longitude: 5.12346, latitude: 45.98765 },
          { number: b.internalNumber, longitude: -120, latitude: -30 },
        ].toSorted((left, right) => left.number! - right.number!),
      );
    },
  );

  pgTest.for([
    { includeSubSamples: undefined, expected: ["Parent"] },
    { includeSubSamples: true, expected: ["Parent", "Sub-sample"] },
  ])(
    "should include sub-samples only when includeSubSamples is $includeSubSamples",
    async ({ includeSubSamples, expected }, { db }) => {
      // Arrange
      const parent = await insertPublished(db, "Parent", point(5, 45));
      const child = await insertPublished(db, "Sub-sample", point(5, 45), {
        parentIds: [parent.id],
      });
      const names = new Map([
        [parent.internalNumber, "Parent"],
        [child.internalNumber, "Sub-sample"],
      ]);
      // Act
      const points = await pointsOf(db, { includeSubSamples });
      // Assert
      expect(points.map(({ number }) => names.get(number))).toEqual(expected);
    },
  );

  pgTest.for([
    { what: "a point", position: point(3.5, 44.25) },
    {
      what: "a line",
      position: {
        type: "line",
        startLongitude: 0,
        startLatitude: 10,
        endLongitude: 20,
        endLatitude: 10,
      },
    },
    {
      what: "an area",
      position: {
        type: "area",
        westLongitude: 0,
        southLatitude: 40,
        eastLongitude: 10,
        northLatitude: 50,
      },
    },
    {
      what: "an antimeridian area",
      position: {
        type: "area",
        westLongitude: 170,
        southLatitude: 0,
        eastLongitude: -170,
        northLatitude: 20,
      },
    },
  ] satisfies { what: string; position: Position }[])(
    "should place $what on its own shape",
    async ({ position }, { db }) => {
      // Arrange
      const sample = await insertPublished(db, "Placed", position);
      // Act
      const [placed] = await pointsOf(db);
      // Assert
      const { onShape } = await sql<{ onShape: boolean }>`
        select ST_Covers(location_geom, ST_SetSRID(ST_MakePoint(${placed?.longitude}, ${placed?.latitude}), 4326)) as "onShape"
          from sample where id = ${sample.id}
      `
        .execute(db)
        .then(({ rows }) => rows[0]!);
      expect(onShape).toBe(true);
    },
  );
});
