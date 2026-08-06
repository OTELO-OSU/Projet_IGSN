import { describe, expect, it } from "vitest";

import {
  activeFacetKeys,
  facetParamKeys,
  facetQueryFields,
  SAMPLE_FACETS,
} from "./facets.ts";

describe("SAMPLE_FACETS", () => {
  it("should have unique keys", () => {
    const keys = SAMPLE_FACETS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("should expose at least one searchable root for every hierarchy facet", () => {
    const hierarchyFacets = SAMPLE_FACETS.filter((f) => f.kind === "hierarchy");
    expect(hierarchyFacets.length).toBeGreaterThan(0);
    for (const facet of hierarchyFacets) {
      const { roots, nodes } = facet.hierarchy;
      expect(roots.some((root) => nodes[root]?.searchable === true)).toBe(true);
    }
  });
});

describe("facetParamKeys", () => {
  it("should list every param, expanding a range facet into three", () => {
    expect(facetParamKeys()).toEqual([
      "type",
      "material",
      "collectionMethod",
      "nature",
      "texture",
      "researchProgramName",
      "researchProgramChief",
      "researchCampaign",
      "collectorName",
      "collectionCurator",
      "ageMin",
      "ageMax",
      "ageUnit",
    ]);
  });
});

describe("facetQueryFields", () => {
  const fields = facetQueryFields();

  it.each([
    ["type", "core.section"],
    ["material", "rock.igneous.plutonic"],
    ["collectionMethod", "coring"],
    ["nature", "rock_powder"],
    ["texture", "aphanitic"],
    ["collectorName", "Marie Curie"],
  ])("should accept a valid %s value", (key, value) => {
    expect(fields[key as keyof typeof fields].parse(value)).toBe(value);
  });

  it.each([
    ["type", "not.a.path"],
    ["material", "definitely_not_a_material"],
    ["nature", "not_a_nature"],
    ["texture", "not_a_texture"],
  ])("should degrade an invalid %s value to no filter", (key, value) => {
    expect(fields[key as keyof typeof fields].parse(value)).toBeUndefined();
  });

  it("should match the facet registry (no drift)", () => {
    expect(Object.keys(fields).sort()).toEqual(facetParamKeys().sort());
  });

  it("should coerce numeric age bounds and validate the unit", () => {
    expect(fields.ageMin.parse("10")).toBe(10);
    expect(fields.ageMax.parse("100")).toBe(100);
    expect(fields.ageUnit.parse("ma")).toBe("ma");
    expect(fields.ageUnit.parse("nope")).toBeUndefined();
  });

  it("should treat a missing value as no filter", () => {
    expect(fields.type.parse(undefined)).toBeUndefined();
    expect(fields.ageMin.parse(undefined)).toBeUndefined();
  });
});

describe("activeFacetKeys", () => {
  it("should list a set non-range facet", () => {
    expect(activeFacetKeys({ nature: "rock_powder" })).toEqual(["nature"]);
  });

  it("should ignore undefined values", () => {
    expect(activeFacetKeys({})).toEqual([]);
  });

  it("should drop a range unit when both bounds are absent", () => {
    expect(activeFacetKeys({ ageUnit: "ga" })).toEqual([]);
  });

  it.each([
    [{ ageMin: -1, ageUnit: "ga" }, ["ageMin", "ageUnit"]],
    [{ ageMax: 100, ageUnit: "ma" }, ["ageMax", "ageUnit"]],
    [{ ageMin: 1, ageMax: 10 }, ["ageMin", "ageMax"]],
  ])("should keep the unit when a bound is set (%o)", (values, expected) => {
    expect(activeFacetKeys(values)).toEqual(expected);
  });
});
