import { sql } from "kysely";
import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { relevanceScore, searchFilters } from "./search-filter.ts";

describe("searchFilters", () => {
  pgTest.for([
    ["the wildcard/substring arm", "gres"],
    ["the typo-tolerance arm", "achondrites"],
  ] as const)(
    "should reach a trigram index for %s",
    async ([, search], { db }) => {
      // Arrange
      await sql`set local enable_seqscan = off`.execute(db);
      // Act
      const plan = await db
        .selectFrom("sample")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where((eb) => eb.and(searchFilters(search)))
        .explain();
      // Assert
      expect(JSON.stringify(plan)).toContain("sample_name_trgm_idx");
    },
  );
});

describe("searchFilters on a renamed sample", () => {
  pgTest(
    "should find a renamed sample by its new name and not its old one",
    async ({ db }) => {
      // Arrange
      const { id } = await insertSample(db, {
        name: "Basalt Block",
        nature: "powder",
        type: null,
        collectionMethod: null,
      });
      await db
        .updateTable("sample")
        .set({ name: "Granite Block" })
        .where("id", "=", id)
        .execute();
      const matches = async (search: string) =>
        db
          .selectFrom("sample")
          .select("id")
          .where((eb) => eb.and(searchFilters(search)))
          .execute();
      // Act
      const found = {
        granite: await matches("granite"),
        basalt: await matches("basalt"),
      };
      // Assert
      expect(found).toEqual({ granite: [{ id }], basalt: [] });
    },
  );
});

describe("relevanceScore", () => {
  pgTest.for([
    ["gres", "Grès de Fontainebleau", null],
    ["basalt", "Basaltic Breccia", null],
    ["basalt", "Basalt", null],
    ["a-b", "Core A-B", null],
    ["gres", "x_gres", null],
    ["GRANITE", "granite", null],
    ["red granite", "Red Granite Core", null],
    ["dunite", "Mantle xenolith", "Dunite"],
  ] as const)(
    "should score %s against %s as pg_trgm's word similarity does",
    async ([needle, name, specificName], { db }) => {
      // Arrange
      const { id } = await insertSample(db, {
        name,
        nature: "powder",
        type: null,
        collectionMethod: null,
      });
      await db
        .updateTable("sample")
        .set({ specific_name: specificName })
        .where("id", "=", id)
        .execute();
      // Act
      const { score, expected } = await db
        .selectFrom("sample")
        .where("id", "=", id)
        .select([
          relevanceScore(needle)!.as("score"),
          sql<number>`GREATEST(${sql.join(
            ["name", "specific_name", "local_id"].map(
              (column) =>
                sql`word_similarity(immutable_unaccent(${needle}), immutable_unaccent(coalesce(${sql.ref(column)}, '')))`,
            ),
          )})`.as("expected"),
        ])
        .executeTakeFirstOrThrow();
      // Assert
      expect(score).toBe(expected);
    },
  );
});
