import { sql } from "kysely";
import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { listAsOwner } from "../../tests/list-as-owner.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { type Transactional } from "../../transaction.ts";
import { deleteSample } from "./delete-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Location sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

async function locationIdOf(db: Transactional<DB>, sampleId: string) {
  const row = await db
    .selectFrom("sample")
    .select("location_id")
    .where("id", "=", sampleId)
    .executeTakeFirstOrThrow();
  return row.location_id;
}

async function countLocations(db: Transactional<DB>) {
  const { count } = await db
    .selectFrom("location")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow();
  return Number(count);
}

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

  pgTest(
    "should keep the sample's own location row across an update",
    async ({ db }) => {
      const created = await insertSample(db, {
        ...base,
        location: { position: { type: "point", longitude: 1, latitude: 1 } },
      });
      const before = await locationIdOf(db, created.id);
      const updated = await updateSample(db, created.id, {
        ...base,
        location: { position: { type: "point", longitude: 2, latitude: 2 } },
      });
      expect(updated?.location?.position).toEqual({
        type: "point",
        longitude: 2,
        latitude: 2,
      });
      expect(await locationIdOf(db, created.id)).toBe(before);
      expect(await countLocations(db)).toBe(1);
    },
  );

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
    expect(await locationIdOf(db, created.id)).toBeNull();
    expect(await countLocations(db)).toBe(0);
  });

  pgTest("should leave no location row without a location", async ({ db }) => {
    const created = await insertSample(db, base);
    expect(await locationIdOf(db, created.id)).toBeNull();
    expect(await countLocations(db)).toBe(0);
  });

  pgTest(
    "should leave no location row when the sample is deleted",
    async ({ db }) => {
      const created = await insertSample(db, {
        ...base,
        location: { position: { type: "point", longitude: 1, latitude: 1 } },
      });
      await deleteSample(db, created.id);
      expect(await countLocations(db)).toBe(0);
    },
  );

  pgTest(
    "should read one shared location row for two samples",
    async ({ db }) => {
      const owner = await insertSample(db, {
        ...base,
        location: {
          position: { type: "point", longitude: 3, latitude: 50 },
          localityName: "Shared place",
        },
      });
      const sharer = await insertSample(db, base);
      await db
        .updateTable("sample")
        .set({ location_id: await locationIdOf(db, owner.id) })
        .where("id", "=", sharer.id)
        .execute();
      expect((await readSample(db, sharer.id))?.location).toEqual(
        (await readSample(db, owner.id))?.location,
      );
      expect(await countLocations(db)).toBe(1);
    },
  );

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
        SELECT sample.id FROM sample
        JOIN location ON location.id = sample.location_id
        WHERE ST_Intersects(location.geom, ST_MakeEnvelope(0, 43, 7, 50, 4326))
      `.execute(db);
      const inJapan = await sql<{ id: string }>`
        SELECT sample.id FROM sample
        JOIN location ON location.id = sample.location_id
        WHERE ST_Intersects(location.geom, ST_MakeEnvelope(135, 34, 140, 36, 4326))
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
        SELECT GeometryType(location.geom) AS type,
               ST_NumGeometries(location.geom) AS parts
        FROM location
        JOIN sample ON sample.location_id = location.id
        WHERE sample.id = ${pacific.id}
      `.execute(db);
      const nearDateline = await sql<{ id: string }>`
        SELECT sample.id FROM sample
        JOIN location ON location.id = sample.location_id
        WHERE ST_Intersects(location.geom, ST_MakeEnvelope(175, 5, 179, 15, 4326))
      `.execute(db);
      const overGreenwich = await sql<{ id: string }>`
        SELECT sample.id FROM sample
        JOIN location ON location.id = sample.location_id
        WHERE ST_Intersects(location.geom, ST_MakeEnvelope(-10, 5, 10, 15, 4326))
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
        SELECT GeometryType(location.geom) AS type FROM location
        JOIN sample ON sample.location_id = location.id
        WHERE sample.id = ${traverse.id}
      `.execute(db);
      const crossing = await sql<{ id: string }>`
        SELECT sample.id FROM sample
        JOIN location ON location.id = sample.location_id
        WHERE ST_Intersects(location.geom, ST_MakeEnvelope(6, 44.5, 7, 45.5, 4326))
      `.execute(db);
      const elsewhere = await sql<{ id: string }>`
        SELECT sample.id FROM sample
        JOIN location ON location.id = sample.location_id
        WHERE ST_Intersects(location.geom, ST_MakeEnvelope(20, 44.5, 21, 45.5, 4326))
      `.execute(db);
      expect(shape.rows[0]).toEqual({ type: "LINESTRING" });
      expect(crossing.rows.map((r) => r.id)).toContain(traverse.id);
      expect(elsewhere.rows.map((r) => r.id)).not.toContain(traverse.id);
    },
  );
});

describe("a child sample's location", () => {
  const paris = {
    position: { type: "point" as const, longitude: 2.35, latitude: 48.85 },
    localityName: "Paris",
  };
  const lyon = {
    position: { type: "point" as const, longitude: 4.83, latitude: 45.76 },
    localityName: "Lyon",
  };

  const insertParent = async (
    db: Transactional<DB>,
    input: Parameters<typeof insertSample>[1],
  ) => (await publishSample(db, (await insertSample(db, input)).id))!;

  pgTest(
    "should point a child at its parent's location row, ignoring its own payload",
    async ({ db }) => {
      const parent = await insertParent(db, { ...base, location: paris });
      const child = await insertSample(db, {
        ...base,
        location: lyon,
        parentIds: [parent.id],
      });
      expect(child.location).toEqual(parent.location);
      expect(await locationIdOf(db, child.id)).toBe(
        await locationIdOf(db, parent.id),
      );
      expect(await countLocations(db)).toBe(1);
    },
  );

  pgTest(
    "should leave the parent's location row untouched when a child submits one on update",
    async ({ db }) => {
      const parent = await insertParent(db, { ...base, location: paris });
      const child = await insertSample(db, { ...base, parentIds: [parent.id] });
      await updateSample(db, child.id, { ...base, location: lyon });
      expect((await readSample(db, parent.id))?.location).toEqual(
        parent.location,
      );
      expect(await locationIdOf(db, child.id)).toBe(
        await locationIdOf(db, parent.id),
      );
      expect(await countLocations(db)).toBe(1);
    },
  );

  pgTest(
    "should show a locality edit made on the parent to its grandchild",
    async ({ db }) => {
      const grandParent = await insertParent(db, { ...base, location: paris });
      const parent = await insertParent(db, {
        ...base,
        parentIds: [grandParent.id],
      });
      const child = await insertSample(db, { ...base, parentIds: [parent.id] });
      await updateSample(db, grandParent.id, {
        ...base,
        location: { ...paris, localityName: "Paris 5e" },
      });
      expect((await readSample(db, child.id))?.location?.localityName).toBe(
        "Paris 5e",
      );
      expect(await locationIdOf(db, child.id)).toBe(
        await locationIdOf(db, grandParent.id),
      );
      expect(await countLocations(db)).toBe(1);
    },
  );

  pgTest(
    "should null only its own pointer when a child clears its location",
    async ({ db }) => {
      const parent = await insertParent(db, { ...base, location: paris });
      const child = await insertSample(db, { ...base, parentIds: [parent.id] });
      await updateSample(db, child.id, {
        ...base,
        material: "synthetic_rock_mineral",
      });
      expect(await locationIdOf(db, child.id)).toBeNull();
      expect((await readSample(db, parent.id))?.location).toEqual(
        parent.location,
      );
      expect(await countLocations(db)).toBe(1);
    },
  );

  pgTest(
    "should leave the child of a synthetic parent without a location",
    async ({ db }) => {
      const parent = await insertParent(db, {
        ...base,
        material: "synthetic_rock_mineral",
      });
      const child = await insertSample(db, {
        ...base,
        location: lyon,
        parentIds: [parent.id],
      });
      expect(child.location).toBeNull();
      expect(await countLocations(db)).toBe(0);
    },
  );
});
