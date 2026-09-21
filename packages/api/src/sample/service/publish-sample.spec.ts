import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { sql } from "kysely";
import { afterEach, beforeEach, describe, expect, vi } from "vitest";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { publishableSample } from "../../tests/sample-fixtures.ts";
import {
  STUB_DATACITE_CONFIG,
  stubDataCite,
} from "../../tests/stub-datacite.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";

describe("publishSample", () => {
  pgTest(
    "should publish the sample with its generated igsn",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, {
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: "rock_and_sediment.sediment",
        collectionMethod: null,
      });
      // Act
      const published = await publishSample(db, created.id);
      // Assert
      expect(published).toMatchObject({
        id: created.id,
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
      });

      const row = await db
        .selectFrom("sample")
        .select(["status", "igsn", "doi_prefix"])
        .where("id", "=", created.id)
        .executeTakeFirstOrThrow();
      expect(row).toEqual({
        status: "published",
        igsn: generateIgsnSuffix(created.id),
        doi_prefix: null,
      });
    },
  );

  pgTest("should return the sample's age", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, {
      name: "Basalt 42",
      nature: "hand_sample",
      type: null,
      age: {
        numericAgeMin: 120,
        numericAgeMax: 120,
        numericAgeUnit: "ma",
        numericAgeYearsUnit: null,
        geologicalAgeMin: 8,
        geologicalAgeMax: 8,
        geologicalUnit: null,
      },
    });
    // Act
    const published = await publishSample(db, created.id);
    // Assert
    expect(published?.age).toMatchObject({
      numericAgeMin: 120,
      numericAgeMax: 120,
      numericAgeUnit: "ma",
      geologicalAgeMin: 8,
    });
  });

  pgTest(
    "should return null when the sample does not exist",
    async ({ db }) => {
      // Act
      const published = await publishSample(
        db,
        "01890a5d-ac96-774b-bcce-b302099a8057",
      );
      // Assert
      expect(published).toBeNull();
    },
  );

  pgTest(
    "should set the publication year to the current year",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, {
        name: "Basalt 42",
        nature: "hand_sample",
        type: null,
      });
      const { year } = await db
        .selectNoFrom(sql<number>`extract(year from now())::int`.as("year"))
        .executeTakeFirstOrThrow();
      // Act
      const published = await publishSample(db, created.id);
      // Assert
      expect(published?.publicationYear).toBe(year);
    },
  );

  pgTest(
    "should keep the first publication year when published twice",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, {
        name: "Basalt 42",
        nature: "hand_sample",
        type: null,
      });
      const first = await publishSample(db, created.id);
      // Act
      const republished = await publishSample(db, created.id);
      // Assert
      expect(republished?.publicationYear).toBe(first?.publicationYear);
    },
  );

  pgTest("should stamp the publication instant", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, {
      name: "Basalt 42",
      nature: "hand_sample",
      type: null,
    });
    // Act
    const published = await publishSample(db, created.id);
    // Assert
    const { published_at: publishedAt } = await db
      .selectFrom("sample")
      .select("published_at")
      .where("id", "=", created.id)
      .executeTakeFirstOrThrow();
    expect(publishedAt).toBeInstanceOf(Date);
    expect(published?.publishedAt).toEqual(publishedAt);
  });

  pgTest(
    "should keep the first publication instant when published twice",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, {
        name: "Basalt 42",
        nature: "hand_sample",
        type: null,
      });
      await publishSample(db, created.id);
      const first = new Date("2024-06-03T10:00:00.000Z");
      await db
        .updateTable("sample")
        .set({ published_at: first })
        .where("id", "=", created.id)
        .execute();
      // Act
      const republished = await publishSample(db, created.id);
      // Assert
      expect(republished?.publishedAt).toEqual(first);
    },
  );

  pgTest("should keep the same igsn when published twice", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, {
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      material: "rock_and_sediment.sediment",
      collectionMethod: null,
    });
    await publishSample(db, created.id);
    // Act
    const republished = await publishSample(db, created.id);
    // Assert
    const row = await db
      .selectFrom("sample")
      .select(["status", "igsn"])
      .where("id", "=", created.id)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({
      status: "published",
      igsn: generateIgsnSuffix(created.id),
    });
    expect(republished).toMatchObject({ id: created.id });
  });
});

describe("publishSample with DataCite configured", () => {
  let fetchMock: ReturnType<typeof stubDataCite>;

  beforeEach(() => {
    fetchMock = stubDataCite(new Response("{}", { status: 201 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  pgTest.for([
    { status: "published" as const, event: "publish" },
    { status: "withdrawn" as const, event: "register" },
  ])(
    "should stamp the configured prefix and register the DOI with the $event event when publishing as $status",
    async ({ status, event }, { db }) => {
      // Arrange
      const created = await insertSample(db, publishableSample);
      // Act
      const published = await publishSample(
        db,
        created.id,
        status,
        STUB_DATACITE_CONFIG,
      );
      // Assert
      expect(published?.doiPrefix).toBe("10.5072");
      const row = await db
        .selectFrom("sample")
        .select("doi_prefix")
        .where("id", "=", created.id)
        .executeTakeFirstOrThrow();
      expect(row.doi_prefix).toBe("10.5072");
      const [, init] = fetchMock.mock.calls[0]!;
      expect(JSON.parse(init.body).data.attributes.event).toBe(event);
    },
  );

  pgTest(
    "should keep the first prefix when published twice under another one",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, publishableSample);
      await publishSample(db, created.id, "published", STUB_DATACITE_CONFIG);
      // Act
      const republished = await publishSample(db, created.id, "published", {
        ...STUB_DATACITE_CONFIG,
        prefix: "10.9999",
      });
      // Assert
      expect(republished?.doiPrefix).toBe("10.5072");
    },
  );

  pgTest("should name the owner as the DOI creator", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, publishableSample);
    const owner = await insertUser(db, "marie.dupont@univ-lorraine.fr", {
      name: "Dupont",
      firstname: "Marie",
    });
    await insertSampleOwner(db, created.id, owner.id);
    // Act
    const published = await publishSample(
      db,
      created.id,
      "published",
      STUB_DATACITE_CONFIG,
    );
    // Assert
    expect(published?.owner).toEqual({ name: "Dupont", firstname: "Marie" });
  });
});
