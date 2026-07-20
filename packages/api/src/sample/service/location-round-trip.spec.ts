import { sql } from "kysely";
import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { getSample } from "./get-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { listSamples } from "./list-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Location sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

describe("sample location persistence", () => {
  pgTest("should round-trip a point location", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      location: {
        position: { type: "point", longitude: 2.35, latitude: 48.85 },
      },
    });
    expect(created.location).toEqual({
      position: { type: "point", longitude: 2.35, latitude: 48.85 },
    });
    expect(await getSample(db, created.id)).toEqual(created);
  });

  pgTest(
    "should round-trip a point elevation as a degenerate range",
    async ({ db }) => {
      const location = {
        position: {
          type: "point" as const,
          longitude: 2.35,
          latitude: 48.85,
          elevation: {
            min: -1200,
            max: -1200,
            unit: "m" as const,
            datum: "msl" as const,
          },
        },
      };
      const created = await insertSample(db, { ...base, location });
      expect(created.location).toEqual(location);
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should round-trip a partial elevation (a draft with a lone bound)",
    async ({ db }) => {
      // A draft may save an elevation before it is complete (completeness gates
      // publish, not the draft); the lone bound must survive the round-trip.
      const location = {
        position: {
          type: "area" as const,
          westLongitude: 5,
          eastLongitude: 8,
          southLatitude: 44,
          northLatitude: 46,
          elevation: { min: -200 },
        },
      };
      const created = await insertSample(db, { ...base, location });
      expect(created.location).toMatchObject(location);
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should round-trip an area with elevation, region and nav",
    async ({ db }) => {
      const location = {
        position: {
          type: "area" as const,
          westLongitude: 5,
          eastLongitude: 8,
          southLatitude: 44,
          northLatitude: 46,
          elevation: {
            min: -200,
            max: 1500,
            unit: "m" as const,
            datum: "msl" as const,
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
      expect((await getSample(db, created.id))?.location).toMatchObject(
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
    const found = await getSample(db, created.id);
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
    expect((await getSample(db, created.id))?.location).toBeNull();
  });

  pgTest("should return the location in a list", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      location: { position: { type: "point", longitude: 3, latitude: 50 } },
    });
    const { data } = await listSamples(db, { page: 1, perPage: 10 });
    expect(data.find((s) => s.id === created.id)?.location?.position).toEqual({
      type: "point",
      longitude: 3,
      latitude: 50,
    });
  });

  pgTest(
    "should match the generated geography in a bounding-box search",
    async ({ db }) => {
      // Paris; the generated geom is a geography point (ADR 0014).
      const paris = await insertSample(db, {
        ...base,
        location: {
          position: { type: "point", longitude: 2.35, latitude: 48.85 },
        },
      });
      const inFrance = await sql<{ id: string }>`
        SELECT id FROM sample
        WHERE ST_Intersects(geom, ST_MakeEnvelope(0, 43, 7, 50, 4326)::geography)
      `.execute(db);
      const inJapan = await sql<{ id: string }>`
        SELECT id FROM sample
        WHERE ST_Intersects(geom, ST_MakeEnvelope(135, 34, 140, 36, 4326)::geography)
      `.execute(db);
      expect(inFrance.rows.map((r) => r.id)).toContain(paris.id);
      expect(inJapan.rows.map((r) => r.id)).not.toContain(paris.id);
    },
  );
});
