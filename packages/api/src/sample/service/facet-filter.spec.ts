import { sql } from "kysely";
import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { facetFilters } from "./facet-filter.ts";
import { sampleFilters } from "./list-sample.ts";

describe("facetFilters", () => {
  pgTest(
    "should reach an index on both halves of a person facet and on its account link",
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
      expect(JSON.stringify(plan)).toContain("sample_sc_collector_user_id_idx");
      expect(JSON.stringify(plan)).toContain("user_firstname_trgm_idx");
      expect(JSON.stringify(plan)).toContain("user_name_trgm_idx");
    },
  );

  pgTest.for([
    ["nature", "powder", "sample_nature_idx"],
    [
      "institutionalOrganization",
      "02feahw73",
      "sample_institutional_organization_idx",
    ],
    ["institutionalOsu", "otelo", "sample_institutional_osu_idx"],
    [
      "institutionalLaboratory",
      "geo_ressources",
      "sample_institutional_laboratory_idx",
    ],
    ["type", "individual_sample", "sample_type_idx"],
    ["collectionMethod", "drilling", "sample_collection_method_idx"],
    ["mineralClassification", "01", "mineral_classification_strunz_id_idx"],
    ["hostInstitution", "02feahw73", "sample_sc_host_institution_idx"],
  ] as const)(
    "should reach an index for the %s facet",
    async ([facet, value, indexName], { db }) => {
      // Arrange
      await sql`set local enable_seqscan = off`.execute(db);
      // Act
      const plan = await db
        .selectFrom("sample")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where((eb) =>
          eb.and(facetFilters({ page: 1, perPage: 10, [facet]: value })),
        )
        .explain();
      // Assert
      expect(JSON.stringify(plan)).toContain(indexName);
    },
  );

  pgTest.for([
    ["nature", "powder"],
    ["material", "rock_and_sediment.rock"],
    ["hostInstitution", "02feahw73"],
    ["manualGroup", "5d1c7a2e-3f4b-4c6d-8e9a-1b2c3d4e5f60"],
  ] as const)(
    "should narrow a searched list by the %s facet inside the ParadeDB scan",
    async ([facet, value], { db }) => {
      // Act
      const plan = await db
        .selectFrom("sample")
        .select("id")
        .where((eb) =>
          eb.and(
            sampleFilters({
              page: 1,
              perPage: 10,
              search: "gres",
              [facet]: value,
            }),
          ),
        )
        .explain();
      // Assert
      expect(JSON.stringify(plan)).toContain(`\\"value\\":\\"${value}\\"`);
    },
  );
});
