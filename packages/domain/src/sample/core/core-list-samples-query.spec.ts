import { describe, expect, it } from "vitest";

import { facetParamKeys } from "../search/facets.ts";
import { MAX_SEARCH_LENGTH } from "../search/search-tokens.ts";
import {
  CORE_FILTER_PARAM,
  coreFilterFields,
  toListSamplesQuery,
} from "./core-list-samples-query.ts";

// Reader-only facets kept off the Core surface, see ADR 0045.
const NON_CORE_FACET_PARAMS = ["includeSubSamples"];

describe("CORE_FILTER_PARAM", () => {
  it("should name every public facet param plus search and bbox (no drift)", () => {
    expect(new Set(Object.values(CORE_FILTER_PARAM))).toEqual(
      new Set([
        ...facetParamKeys().filter(
          (key) => !NON_CORE_FACET_PARAMS.includes(key),
        ),
        "search",
        "bbox",
      ]),
    );
  });
});

describe("coreFilterFields", () => {
  it("should expose one field per Core param", () => {
    expect(Object.keys(coreFilterFields()).sort()).toEqual(
      Object.keys(CORE_FILTER_PARAM).sort(),
    );
  });

  it.each(["projectName", "chiefScientist", "collector"])(
    "should truncate an over-long %s value",
    (key) => {
      const fields = coreFilterFields();
      expect(
        fields[key as keyof typeof fields].parse(
          "a".repeat(MAX_SEARCH_LENGTH + 50),
        ),
      ).toBe("a".repeat(MAX_SEARCH_LENGTH));
    },
  );

  it.each([
    ["materialCategory", "definitely_not_a_material"],
    ["natureOfSample", "not_a_nature"],
    ["affiliationOrganization", "not-a-ror"],
  ])("should reject an invalid %s value", (key, value) => {
    const fields = coreFilterFields();
    expect(fields[key as keyof typeof fields].safeParse(value).success).toBe(
      false,
    );
  });
});

describe("toListSamplesQuery", () => {
  it("should rename the Core params and pass the paging through", () => {
    expect(
      toListSamplesQuery({
        page: 2,
        perPage: 50,
        search: "granite",
        sampleObjectType: "core.section",
        materialCategory: "rock_and_sediment.rock",
        projectName: "Alpes",
        hostingInstitution: "02feahw73",
        numericAgeMin: 10,
        numericAgeUnit: "ma",
        affiliationLaboratory: "EA4038",
        contributor: "3f9a2c18-5d7b-4e2a-9c0f-1b8e4d6a2f57",
      }),
    ).toEqual({
      page: 2,
      perPage: 50,
      search: "granite",
      type: "core.section",
      material: "rock_and_sediment.rock",
      researchProgramName: "Alpes",
      hostInstitution: "02feahw73",
      ageMin: 10,
      ageUnit: "ma",
      institutionalLaboratory: "EA4038",
      contributor: "3f9a2c18-5d7b-4e2a-9c0f-1b8e4d6a2f57",
    });
  });
});
