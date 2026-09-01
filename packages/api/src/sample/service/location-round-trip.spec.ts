import { sql } from "kysely";
import { describe, expect } from "vitest";

import { listAsOwner } from "../../tests/list-as-owner.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Location sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

describe("sample location persistence", () => {
  pgTest.for([
    [
      "point",
      { position: { type: "point", longitude: 2.35, latitude: 48.85 } },
    ],
    [
      "point with a decimal vertical position",
      {
        position: {
          type: "point",
          longitude: 2.35,
          latitude: 48.85,
          vertical: {
            position: 1200.5,
            reference: "bathymetry",
            system: "msl",
          },
        },
      },
    ],
    [
      "line with a vertical position per endpoint",
      {
        position: {
          type: "line",
          startLongitude: 5,
          startLatitude: 44,
          endLongitude: 8,
          endLatitude: 46,
          vertical: {
            start: 120,
            end: 340.5,
            reference: "elevation",
            system: "ngf_ign69",
          },
        },
      },
    ],
  ] as const)(
    "should round-trip a %s location",
    async ([, location], { db }) => {
      const created = await insertSample(db, { ...base, location });
      expect(created.location).toEqual(location);
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should round-trip a partial vertical position (a draft with a lone bound)",
    async ({ db }) => {
      const created = await insertSample(db, {
        ...base,
        location: {
          position: {
            type: "area",
            westLongitude: 5,
            eastLongitude: 8,
            southLatitude: 44,
            northLatitude: 46,
            vertical: { min: 200 },
          },
        },
      });
      expect(created.location).toEqual({
        position: {
          type: "area",
          westLongitude: 5,
          eastLongitude: 8,
          southLatitude: 44,
          northLatitude: 46,
          vertical: { min: 200, max: null, reference: null, system: null },
        },
      });
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should round-trip an area with a vertical range, region and nav",
    async ({ db }) => {
      const location = {
        position: {
          type: "area" as const,
          westLongitude: 5,
          eastLongitude: 8,
          southLatitude: 44,
          northLatitude: 46,
          vertical: {
            min: 200,
            max: 1500,
            reference: "elevation" as const,
            system: "msl" as const,
          },
        },
        region: {
          kind: "ocean" as const,
          oceanSea: "mediterranean_sea" as const,
        },
        navigationType: "GPS" as const,
        localityName: "Test locality",
      };
      const created = await insertSample(db, { ...base, location });
      expect((await readSample(db, created.id))?.location).toMatchObject(
        location,
      );
    },
  );

  pgTest("should round-trip a locality-only location", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      location: {
        localityName: "Named place",
        localityDescription: "No coords",
      },
    });
    const found = await readSample(db, created.id);
    expect(found?.location).toMatchObject({
      localityName: "Named place",
      localityDescription: "No coords",
    });
    expect(found?.location?.position ?? null).toBeNull();
  });

  pgTest("should replace the location on update", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      location: { position: { type: "point", longitude: 0, latitude: 0 } },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      location: {
        position: {
          type: "area",
          westLongitude: 5,
          eastLongitude: 8,
          southLatitude: 44,
          northLatitude: 46,
        },
      },
    });
    expect(updated?.location?.position).toEqual({
      type: "area",
      westLongitude: 5,
      eastLongitude: 8,
      southLatitude: 44,
      northLatitude: 46,
    });
  });

  pgTest("should clear the location when updated to null", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      location: { position: { type: "point", longitude: 1, latitude: 1 } },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      location: null,
    });
    expect(updated?.location).toBeNull();
    expect((await readSample(db, created.id))?.location).toBeNull();
  });

  pgTest("should return the location in a list", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      location: { position: { type: "point", longitude: 3, latitude: 50 } },
    });
    const { data } = await listAsOwner(db, { page: 1, perPage: 10 });
    expect(data.find((s) => s.id === created.id)?.location?.position).toEqual({
      type: "point",
      longitude: 3,
      latitude: 50,
    });
  });

  pgTest(
    "should match the generated planar geometry in a bounding-box search",
    async ({ db }) => {
      const paris = await insertSample(db, {
        ...base,
        location: {
          position: { type: "point", longitude: 2.35, latitude: 48.85 },
        },
      });
      const inFrance = await sql<{ id: string }>`
        SELECT id FROM sample
        WHERE ST_Intersects(geom, ST_MakeEnvelope(0, 43, 7, 50, 4326))
      `.execute(db);
      const inJapan = await sql<{ id: string }>`
        SELECT id FROM sample
        WHERE ST_Intersects(geom, ST_MakeEnvelope(135, 34, 140, 36, 4326))
      `.execute(db);
      expect(inFrance.rows.map((r) => r.id)).toContain(paris.id);
      expect(inJapan.rows.map((r) => r.id)).not.toContain(paris.id);
    },
  );

  pgTest(
    "should split a dateline-crossing stored area into two halves in geom",
    async ({ db }) => {
      const pacific = await insertSample(db, {
        ...base,
        location: {
          position: {
            type: "area",
            westLongitude: 170,
            eastLongitude: -170,
            southLatitude: 0,
            northLatitude: 20,
          },
        },
      });
      const shape = await sql<{ type: string; parts: number }>`
        SELECT GeometryType(geom) AS type, ST_NumGeometries(geom) AS parts
        FROM sample WHERE id = ${pacific.id}
      `.execute(db);
      const nearDateline = await sql<{ id: string }>`
        SELECT id FROM sample
        WHERE ST_Intersects(geom, ST_MakeEnvelope(175, 5, 179, 15, 4326))
      `.execute(db);
      const overGreenwich = await sql<{ id: string }>`
        SELECT id FROM sample
        WHERE ST_Intersects(geom, ST_MakeEnvelope(-10, 5, 10, 15, 4326))
      `.execute(db);
      expect(shape.rows[0]).toEqual({ type: "MULTIPOLYGON", parts: 2 });
      expect(nearDateline.rows.map((r) => r.id)).toContain(pacific.id);
      expect(overGreenwich.rows.map((r) => r.id)).not.toContain(pacific.id);
    },
  );

  pgTest(
    "should store a line as a linestring found by a bounding-box search",
    async ({ db }) => {
      const traverse = await insertSample(db, {
        ...base,
        location: {
          position: {
            type: "line",
            startLongitude: 5,
            startLatitude: 44,
            endLongitude: 8,
            endLatitude: 46,
          },
        },
      });
      const shape = await sql<{ type: string }>`
        SELECT GeometryType(geom) AS type FROM sample WHERE id = ${traverse.id}
      `.execute(db);
      const crossing = await sql<{ id: string }>`
        SELECT id FROM sample
        WHERE ST_Intersects(geom, ST_MakeEnvelope(6, 44.5, 7, 45.5, 4326))
      `.execute(db);
      const elsewhere = await sql<{ id: string }>`
        SELECT id FROM sample
        WHERE ST_Intersects(geom, ST_MakeEnvelope(20, 44.5, 21, 45.5, 4326))
      `.execute(db);
      expect(shape.rows[0]).toEqual({ type: "LINESTRING" });
      expect(crossing.rows.map((r) => r.id)).toContain(traverse.id);
      expect(elsewhere.rows.map((r) => r.id)).not.toContain(traverse.id);
    },
  );
});
