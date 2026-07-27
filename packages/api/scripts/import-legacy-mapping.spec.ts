import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { describe, expect, it } from "vitest";

import {
  type LegacyRow,
  extractCollector,
  isKnownMaterialPath,
  mapAge,
  mapCollectionMethod,
  mapCountry,
  mapElevation,
  mapMaterial,
  mapResourceType,
  mapSize,
  toCreateSample,
  unmappableValues,
} from "./import-legacy-mapping.ts";

// A legacy row with everything empty; tests override only the fields they cover.
function legacyRow(overrides: Partial<LegacyRow> = {}): LegacyRow {
  return {
    name: "Sample",
    igsn: "CNRS0000012260",
    publish_date: null,
    last_modified: new Date("2022-02-27T00:00:00Z"),
    latitude: null,
    longitude: null,
    latitude_end: null,
    longitude_end: null,
    elevation: null,
    elevation_end: null,
    elevation_unit: null,
    bathy: null,
    bathy_unit: null,
    collection_start_date: null,
    collection_end_date: null,
    collector: null,
    cruise_field_prgm: null,
    field_name: null,
    purpose: null,
    resource_comment: null,
    size: null,
    size_unit: null,
    other_names: null,
    locality_description: null,
    location_text: null,
    location_description: null,
    collection_method_desc: null,
    material: null,
    classification: null,
    collection_method: null,
    resource_type: null,
    country: null,
    navigation_type: null,
    age_min: null,
    age_max: null,
    age_unit: null,
    geological_unit: null,
    geological_age: null,
    ...overrides,
  };
}

describe("mapMaterial", () => {
  it("should slug a legacy classification path under rock", () => {
    expect(mapMaterial("Igneous>Volcanic>Mafic", null)).toBe(
      "rock.igneous.volcanic.mafic",
    );
  });

  it("should keep the longest valid prefix when the tail is unknown", () => {
    expect(mapMaterial("Igneous>Volcanic>NotAThing", null)).toBe(
      "rock.igneous.volcanic",
    );
  });

  it("should keep the longest valid prefix when only the family is known", () => {
    // The new tree lacks a `gneiss` node under `metamorphic`, so it truncates.
    expect(mapMaterial("Metamorphic>Gneiss", "Rock")).toBe("rock.metamorphic");
  });

  it("should fall back to the material root when classification is absent", () => {
    expect(mapMaterial(null, "Sediment")).toBe("sediment");
  });

  it("should drop a classification the new tree cannot place, not coarsen it to the material root", () => {
    // Xenolithic has no branch in the new tree; dropping is more honest than
    // asserting a bare "rock" from the material_id.
    expect(mapMaterial("Xenolithic>Igneous>Plutonic>Ultramafic", "Rock")).toBe(
      null,
    );
    expect(mapMaterial("Ore>Oxide", "Ice")).toBe(null);
  });
});

describe("isKnownMaterialPath", () => {
  it.each([
    ["Igneous>Plutonic>Felsic", "Rock"], // whole path is a supported node
    ["Igneous>Plutonic", "Rock"], // incomplete but a valid prefix of complete paths
    ["Metamorphic", "Rock"], // genuinely coarse at the source
    [null, "Rock"], // coarse root, source knew only "Rock"
  ] as const)("should import %s / %s", (classification, material) => {
    expect(isKnownMaterialPath(classification, material)).toBe(true);
  });

  it.each([
    ["Metamorphic>Gneiss", "Rock"], // rock.metamorphic.gneiss is not a supported path
    ["Igneous>Volcanic>NotAThing", "Rock"], // fabricated leaf
    ["Xenolithic>Igneous>Plutonic>Ultramafic", "Rock"], // unplaceable root
    ["Ore>Sulfide", "Rock"],
    [null, "Soil"], // material_id the new roots lack
    [null, null], // no material signal at all
  ] as const)("should skip %s / %s", (classification, material) => {
    expect(isKnownMaterialPath(classification, material)).toBe(false);
  });
});

describe("mapCountry", () => {
  it.each([
    ["France", "FR"], // ICU label matches directly
    ["Reunion", "RE"], // accent folded from ICU "Réunion"
    ["Deutschland", "DE"], // endonym alias
    ["Italia", "IT"], // endonym alias
    ["Slovenija", "SI"], // endonym alias
    ["Swaziland", "SZ"], // former name of Eswatini
    ["Turkey", "TR"], // ICU label is "Türkiye"
    ["Congo, The Democratic Republic Of The", "CD"],
    ["Saint Vincent And The Grenadines", "VC"],
  ] as const)("should map %s to %s", (name, code) => {
    expect(mapCountry(name)).toBe(code);
  });

  it("should return null for an unknown country", () => {
    expect(mapCountry("Neverland")).toBe(null);
  });
});

describe("mapCollectionMethod", () => {
  it("should slug a legacy method path", () => {
    expect(mapCollectionMethod("Coring>GravityCorer>Giant")).toBe(
      "coring.gravity_corer.giant",
    );
  });

  it("should drop an unmappable method", () => {
    expect(mapCollectionMethod("Totally Unknown Method")).toBe(null);
  });
});

describe("mapResourceType", () => {
  it.each([
    ["Thin section", { type: null, nature: "thin_section" }],
    ["Rock powder", { type: null, nature: "rock_powder" }],
    ["Hand sample", { type: null, nature: "hand_sample" }],
    ["Residue", { type: null, nature: "residue" }],
    ["Core section", { type: "core.section", nature: "inapplicable" }],
    ["Core whole round", { type: "core.whole_round", nature: "inapplicable" }],
    ["Dredge", { type: "dredge", nature: "inapplicable" }],
    ["Grab", { type: null, nature: "inapplicable" }],
  ] as const)("should map %s", (input, expected) => {
    expect(mapResourceType(input)).toEqual(expected);
  });
});

describe("extractCollector", () => {
  it("should split a name and its inline ORCID", () => {
    expect(
      extractCollector("Jostein Bakke (ORCID:0000-0001-6114-0400)"),
    ).toEqual({ name: "Jostein Bakke", orcid: "0000-0001-6114-0400" });
  });

  it("should return a bare name with no ORCID", () => {
    expect(extractCollector("Frederique Eynaud")).toEqual({
      name: "Frederique Eynaud",
      orcid: null,
    });
  });
});

describe("mapSize", () => {
  it("should fill all three dimensions from a single number", () => {
    const m = { value: 424, unit: "cm" };
    expect(mapSize("424.0", "centimeter")).toEqual({
      length: m,
      width: m,
      thickness: m,
    });
  });

  it("should return nothing for an AxBxC triple (rejected, not guessed)", () => {
    expect(mapSize("9x5x6", "cm")).toEqual({});
  });

  it("should treat a lone slash as no value", () => {
    expect(mapSize("/", "cm")).toEqual({});
  });

  it("should return nothing for a non-numeric size", () => {
    expect(mapSize("n/a", "cm")).toEqual({});
  });
});

describe("mapElevation", () => {
  it("should keep land elevation positive", () => {
    expect(
      mapElevation(legacyRow({ elevation: "120", elevation_unit: "m" })),
    ).toEqual({
      min: 120,
      max: 120,
      unit: "m",
      datum: null,
    });
  });

  it("should store bathymetry as a negative elevation at mean sea level", () => {
    expect(mapElevation(legacyRow({ bathy: "2000", bathy_unit: "m" }))).toEqual(
      {
        min: -2000,
        max: -2000,
        unit: "m",
        datum: "msl",
      },
    );
  });

  it("should drop an unknown elevation unit", () => {
    expect(
      mapElevation(legacyRow({ elevation: "5", elevation_unit: "Outcrop" })),
    ).toBe(null);
  });
});

describe("mapAge", () => {
  it("should map a numeric age with its unit", () => {
    expect(
      mapAge(legacyRow({ age_min: "5", age_max: "10", age_unit: "Ma" })),
    ).toEqual({
      numericAgeMin: 5,
      numericAgeMax: 10,
      numericAgeUnit: "ma",
      numericAgeYearsUnit: null,
      geologicalAgeMin: null,
      geologicalAgeMax: null,
      geologicalUnit: null,
    });
  });
});

describe("toCreateSample", () => {
  it("should produce a valid create payload for a realistic row", () => {
    const row = legacyRow({
      name: "APO19-01",
      latitude: -49.16975,
      longitude: 69.153053,
      collection_start_date: "2019-11-25",
      collection_end_date: "2019-12-24",
      collector: "Jostein Bakke (ORCID:0000-0001-6114-0400)",
      classification: "Sedimentary",
      collection_method: "Coring>GravityCorer>Giant",
      resource_type: "Core section",
      country: "France",
      size: "197.0",
      size_unit: "centimeter",
    });
    const result = createSampleSchema.safeParse(toCreateSample(row));
    expect(result.success).toBe(true);
  });

  it("should default nature to inapplicable and still validate a bare row", () => {
    const result = createSampleSchema.safeParse(toCreateSample(legacyRow()));
    expect(result).toMatchObject({
      success: true,
      data: { nature: "inapplicable" },
    });
  });
});

describe("unmappableValues", () => {
  // A row whose every controlled value normalizes cleanly, so nothing is flagged.
  const goodRow = (overrides: Partial<LegacyRow> = {}) =>
    legacyRow({ classification: "Igneous>Plutonic>Felsic", ...overrides });

  it("should flag nothing when every controlled value maps", () => {
    expect(unmappableValues(goodRow())).toEqual([]);
  });

  it.each([
    {
      case: "an unplaceable material classification",
      overrides: { classification: "Xenolithic>Igneous", material: "Rock" },
      expected: { field: "material", value: "Xenolithic>Igneous" },
    },
    {
      case: "no material at all",
      overrides: { classification: null, material: null },
      expected: { field: "material", value: "(none)" },
    },
    {
      case: "an unknown collection method",
      overrides: { collection_method: "Totally Unknown Method" },
      expected: { field: "collection_method", value: "Totally Unknown Method" },
    },
    {
      case: "a resource type that is neither a type nor a nature",
      overrides: { resource_type: "Grab" },
      expected: { field: "resource_type", value: "Grab" },
    },
    {
      case: "an unknown country",
      overrides: { country: "Neverland" },
      expected: { field: "country", value: "Neverland" },
    },
    {
      case: "an unknown navigation type",
      overrides: { navigation_type: "not-a-code" },
      expected: { field: "navigation_type", value: "not-a-code" },
    },
    {
      case: "a size that is not a single number",
      overrides: { size: "9x5x6", size_unit: "cm" },
      expected: { field: "size", value: "9x5x6" },
    },
    {
      case: "an unknown size unit paired with a single number",
      overrides: { size: "10", size_unit: "furlong" },
      expected: { field: "size_unit", value: "furlong" },
    },
    {
      case: "an unknown elevation unit paired with an elevation",
      overrides: { elevation: "5", elevation_unit: "Outcrop" },
      expected: { field: "elevation_unit", value: "Outcrop" },
    },
    {
      case: "an unknown age unit paired with a numeric age",
      overrides: { age_min: "5", age_unit: "eons" },
      expected: { field: "age_unit", value: "eons" },
    },
  ] as const)("should flag $case", ({ overrides, expected }) => {
    expect(unmappableValues(goodRow(overrides))).toEqual([expected]);
  });

  it("should not flag a physical-form resource type that maps to a nature", () => {
    // "Thin section" is a nature, not a type path, so it is fully mapped.
    expect(
      unmappableValues(goodRow({ resource_type: "Thin section" })),
    ).toEqual([]);
  });

  it("should not flag a stray unit with no measurement to lose", () => {
    expect(unmappableValues(goodRow({ size_unit: "furlong" }))).toEqual([]);
  });

  it("should not flag a single-number size or a lone slash", () => {
    expect(unmappableValues(goodRow({ size: "10", size_unit: "cm" }))).toEqual(
      [],
    );
    expect(unmappableValues(goodRow({ size: "/", size_unit: "cm" }))).toEqual(
      [],
    );
  });

  it("should collect every offending value in one row", () => {
    expect(
      unmappableValues(
        goodRow({ collection_method: "Nope", country: "Neverland" }),
      ),
    ).toEqual([
      { field: "collection_method", value: "Nope" },
      { field: "country", value: "Neverland" },
    ]);
  });
});
