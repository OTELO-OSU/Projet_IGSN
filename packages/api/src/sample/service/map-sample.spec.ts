import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { SampleMapQuery } from "@projet-igsn/domain/sample/map/model";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { mapPublishedSamples } from "./map-sample.ts";
import { publishSample } from "./publish-sample.ts";

type Position = NonNullable<Location["position"]>;

const WORLD = { west: -180, south: -90, east: 180, north: 90 };

async function insertPublished(
  db: Transactional<DB>,
  name: string,
  position: Position | null,
  nature: "powder" | "thin_section" = "powder",
): Promise<Sample> {
  const { id } = await insertSample(db, {
    name,
    nature,
    type: null,
    collectionMethod: null,
    material: "rock_and_sediment.sediment",
    ...(position ? { location: { position } } : {}),
  });
  const published = await publishSample(db, id);
  if (!published) throw new Error(`${name} vanished`);
  return published;
}

const point = (longitude: number, latitude: number): Position => ({
  type: "point",
  longitude,
  latitude,
});

const area = (
  westLongitude: number,
  southLatitude: number,
  eastLongitude: number,
  northLatitude: number,
): Position => ({
  type: "area",
  westLongitude,
  southLatitude,
  eastLongitude,
  northLatitude,
});

const single = (sample: Sample, longitude: number, latitude: number) => ({
  longitude,
  latitude,
  count: 1,
  extent: {
    west: longitude,
    south: latitude,
    east: longitude,
    north: latitude,
  },
  sample: {
    igsn: sample.igsn,
    name: sample.name,
    material: "rock_and_sediment.sediment",
  },
});

const map = (db: Transactional<DB>, query: Partial<SampleMapQuery> = {}) =>
  mapPublishedSamples(db, { viewport: WORLD, zoom: 20, ...query });

describe("mapPublishedSamples", () => {
  pgTest(
    "should count the located matches inside the viewport once, meta.extent spanning every located match",
    async ({ db }) => {
      // Arrange
      await insertPublished(db, "Grès A", point(5, 45));
      await insertPublished(db, "Grès B", point(6, 46));
      await insertPublished(db, "Grès beyond the viewport", point(8, 44));
      await insertPublished(db, "Basalte", point(5, 45));
      await insertPublished(db, "Grès thin", point(5, 45), "thin_section");
      await insertPublished(db, "Grès beyond the bbox", point(100, 45));
      // Act
      const { data, meta } = await map(db, {
        search: "gres",
        nature: "powder",
        bbox: { west: -10, south: 40, east: 10, north: 50 },
        viewport: { west: 0, south: 40, east: 7, north: 50 },
        zoom: 0,
      });
      // Assert
      expect({
        total: data.reduce((sum, cluster) => sum + cluster.count, 0),
        extent: meta.extent,
      }).toEqual({
        total: 2,
        extent: { west: 5, south: 44, east: 8, north: 46 },
      });
    },
  );

  pgTest(
    "should leave every unpublished sample off the map",
    async ({ db }) => {
      // Arrange
      const statuses = [
        "draft",
        "publishing",
        "publish_failed",
        "withdrawn",
        "tombstone",
      ] as const;
      for (const [index, status] of statuses.entries()) {
        const sample = await insertPublished(db, status, point(index * 20, 0));
        await db
          .updateTable("sample")
          .set({ status })
          .where("id", "=", sample.id)
          .execute();
      }
      // Act / Assert
      expect(await map(db)).toEqual({ data: [], meta: { extent: null } });
    },
  );

  pgTest.for([
    {
      what: "a point where it is",
      position: point(3.5, 44.25),
      viewport: WORLD,
      at: [3.5, 44.25],
    },
    {
      what: "an area partly visible at the centre of its visible part",
      position: area(0, 40, 10, 50),
      viewport: { west: 5, south: 0, east: 20, north: 60 },
      at: [7.5, 45],
    },
    {
      what: "a line partly visible on its visible part",
      position: {
        type: "line",
        startLongitude: 0,
        startLatitude: 10,
        endLongitude: 20,
        endLatitude: 10,
      },
      viewport: { west: 10, south: 0, east: 30, north: 20 },
      at: [15, 10],
    },
    {
      what: "an antimeridian area at the centre of its visible half",
      position: area(170, 0, -170, 20),
      viewport: { west: 100, south: -10, east: 180, north: 30 },
      at: [175, 10],
    },
  ] as const)(
    "should place $what",
    async ({ position, viewport, at: [longitude, latitude] }, { db }) => {
      // Arrange
      await insertPublished(db, "Placed", position);
      // Act
      const { data } = await map(db, { viewport });
      // Assert
      expect(data).toMatchObject([{ longitude, latitude, count: 1 }]);
    },
  );

  pgTest(
    "should merge nearby samples at low zoom and split them into single markers at high zoom",
    async ({ db }) => {
      // Arrange
      const a = await insertPublished(db, "Grès A", point(5, 45));
      const b = await insertPublished(db, "Grès B", point(5.5, 45.5));
      // Act
      const low = await map(db, { zoom: 0 });
      const high = await map(db, {
        zoom: 20,
        viewport: { west: 4, south: 44, east: 7, north: 47 },
      });
      // Assert
      expect(low.data).toEqual([
        {
          longitude: 5.25,
          latitude: 45.25,
          count: 2,
          extent: { west: 5, south: 45, east: 5.5, north: 45.5 },
        },
      ]);
      expect(
        high.data.toSorted((left, right) => left.longitude - right.longitude),
      ).toEqual([single(a, 5, 45), single(b, 5.5, 45.5)]);
    },
  );

  pgTest(
    "should cap a whole-world viewport to coarse clusters whatever the zoom",
    async ({ db }) => {
      // Arrange
      await insertPublished(db, "Grès A", point(1, 1));
      await insertPublished(db, "Grès B", point(2, 2));
      // Act
      const { data } = await map(db, { zoom: 20 });
      // Assert
      expect(data).toMatchObject([{ count: 2 }]);
    },
  );

  pgTest.for([
    { name: "an area", position: area(4, 44, 6, 46) },
    {
      name: "a line",
      position: {
        type: "line",
        startLongitude: 4,
        startLatitude: 44,
        endLongitude: 6,
        endLatitude: 46,
      } as Position,
    },
  ])(
    "should give a single marker the position of $name",
    async ({ position }, { db }) => {
      // Arrange
      await insertPublished(db, "Shaped", position);
      // Act
      const { data } = await map(db);
      // Assert
      expect(data.map((cluster) => cluster.sample?.position)).toEqual([
        position,
      ]);
    },
  );
});
