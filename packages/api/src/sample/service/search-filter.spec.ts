import { sql } from "kysely";
import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { searchFilters } from "./search-filter.ts";

// A query that builds a slightly different expression silently loses the
// gin_trgm_ops indexes. Seqscan off: which index Postgres can use, not which it
// would prefer on an empty table.
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

  pgTest("should reach the igsn index for the exact arm", async ({ db }) => {
    await sql`set local enable_seqscan = off`.execute(db);

    const plan = await db
      .selectFrom("sample")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where((eb) => eb.and(searchFilters("0123456789ABCDEFGHJKMNPQRS")))
      .explain();

    expect(JSON.stringify(plan)).toContain("sample_igsn_key");
  });
});
