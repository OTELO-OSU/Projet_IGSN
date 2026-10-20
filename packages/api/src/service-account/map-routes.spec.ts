import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { pgTest } from "../tests/pg-test.ts";

const LABORATORY = "UMR7358";
const OTHER_LABORATORY = "UMR5275";

type Position = NonNullable<Location["position"]>;

const point = (longitude: number, latitude: number): Position => ({
  type: "point",
  longitude,
  latitude,
});

async function insertPublished(
  db: Kysely<DB>,
  name: string,
  position: Position | null,
  extra: Partial<CreateSample> = {},
  laboratory = LABORATORY,
): Promise<Sample> {
  const { id } = await insertSample(
    db,
    {
      name,
      nature: "powder",
      type: null,
      collectionMethod: null,
      material: "rock_and_sediment.sediment",
      ...(position ? { location: { position } } : {}),
      ...extra,
    },
    {
      institutionalOrganization: null,
      institutionalOsu: null,
      institutionalLaboratory: laboratory,
    },
  );
  const published = await publishSample(db, id);
  if (!published) throw new Error(`${name} vanished`);
  return published;
}

const feature = (sample: Sample, longitude: number, latitude: number) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [longitude, latitude] },
  properties: { igsn: sample.igsn, name: sample.name },
});

type Feature = ReturnType<typeof feature>;

const byIgsn = (features: Feature[]) =>
  features.toSorted((left, right) =>
    String(left.properties.igsn).localeCompare(String(right.properties.igsn)),
  );

async function readMap(db: Kysely<DB>, query = "") {
  const res = await createApp(db).app.request(`/service/samples/map${query}`);
  const body = (await res.json()) as {
    type: string;
    features: Feature[];
  };
  return {
    status: res.status,
    contentType: res.headers.get("Content-Type"),
    body: { ...body, features: byIgsn(body.features) },
  };
}

describe("GET /service/samples/map", () => {
  pgTest(
    "should answer only the published, located, parentless samples as a GeoJSON FeatureCollection",
    async ({ db }) => {
      // Arrange
      const a = await insertPublished(
        db,
        "Sandstone A",
        point(5.123456789, 45.987654321),
      );
      const b = await insertPublished(db, "Sandstone B", point(-120, -30));
      await insertPublished(db, "Unlocated", null);
      await insertPublished(db, "Sub-sample", null, { parentIds: [a.id] });
      for (const status of [
        "draft",
        "embargo",
        "withdrawn",
        "tombstone",
      ] as const) {
        const sample = await insertPublished(db, status, point(3, 3));
        await db
          .updateTable("sample")
          .set({ status })
          .where("id", "=", sample.id)
          .execute();
      }
      // Act
      const map = await readMap(db);
      // Assert
      expect(map).toEqual({
        status: 200,
        contentType: "application/geo+json",
        body: {
          type: "FeatureCollection",
          features: byIgsn([
            feature(a, 5.12346, 45.98765),
            feature(b, -120, -30),
          ]),
        },
      });
    },
  );

  pgTest("should narrow the collection by a Core filter", async ({ db }) => {
    // Arrange
    const kept = await insertPublished(db, "Kept", point(1, 2));
    await insertPublished(db, "Elsewhere", point(1, 2), {}, OTHER_LABORATORY);
    // Act
    const map = await readMap(db, `?affiliationLaboratory=${LABORATORY}`);
    // Assert
    expect(map.body).toEqual({
      type: "FeatureCollection",
      features: [feature(kept, 1, 2)],
    });
  });

  pgTest("should refuse an oversized bbox", async ({ db }) => {
    // Act
    const res = await createApp(db).app.request(
      "/service/samples/map?bbox=-180,-90,180,90",
    );
    // Assert
    expect({ status: res.status, body: await res.json() }).toEqual({
      status: 400,
      body: { error: "Invalid query parameters" },
    });
  });
});
