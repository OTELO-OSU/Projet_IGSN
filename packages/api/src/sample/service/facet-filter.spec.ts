import { sql } from "kysely";
import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { facetFilters } from "./facet-filter.ts";

describe("facetFilters", () => {
  pgTest(
    "should reach a trigram index on both halves of a person facet",
    async ({ db }) => {
      // Arrange
      await sql`set local enable_seqscan = off`.execute(db);
      // Act
      const plan = await db
        .selectFrom("sample")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where((eb) =>
          eb.and(
            facetFilters({ page: 1, perPage: 10, collectorName: "curie" }),
          ),
        )
        .explain();
      // Assert
      expect(JSON.stringify(plan)).toContain(
        "sample_sc_collector_firstname_trgm_idx",
      );
      expect(JSON.stringify(plan)).toContain(
        "sample_sc_collector_lastname_trgm_idx",
      );
    },
  );
});
