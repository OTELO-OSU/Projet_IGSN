import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { describe, expect, it } from "vitest";

import {
  type LegacyRow,
  droppedDoiLinks,
  isKnownMaterialPath,
  mapAge,
  mapCollectionMethod,
  mapCountry,
  mapDoiLink,
  mapElevation,
  mapMaterial,
  mapResourceType,
  mapSize,
  parseCollector,
  toCreateSample,
  toOwner,
  unmappableValues,
} from "./import-legacy-mapping.ts";

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
    owner_email: null,
    owner_first_name: null,
    owner_last_name: null,
    doi_related_resources: [],
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
    expect(mapMaterial("Metamorphic>Granoblastite", "Rock")).toBe(
      "rock.metamorphic",
    );
  });

  it.each([
    [
      "Metamorphic>Calc-Silicate",
      "rock.metamorphic.strongly_metamorphosed.calc_silicate_rock",
    ],
    ["Metamorphic>Gneiss", "rock.metamorphic.strongly_metamorphosed.gneiss"],
    [
      "Metamorphic>Granulite",
      "rock.metamorphic.strongly_metamorphosed.granulite",
    ],
    ["Metamorphic>Schist", "rock.metamorphic.strongly_metamorphosed.schist"],
    ["Metamorphic>Slate", "rock.metamorphic.strongly_metamorphosed.slate"],
    [
      "Metamorphic>Granofels",
      "rock.metamorphic.strongly_metamorphosed.granofels",
    ],
    [
      "Sedimentary>Carbonate",
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock",
    ],
    [
      "Sedimentary>ConglomerateAndOrBreccia",
      "rock.sedimentary.clastic_sedimentary_rock.paraconglomerate",
    ],
    [
      "Sedimentary>Ironstone",
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.ironstone",
    ],
    [
      "Sedimentary>MixedCarb-Siliciclastic",
      "rock.sedimentary.hybrid_sedimentary_rock",
    ],
    [
      "Sedimentary>SiliceousBiogenic",
      "rock.sedimentary.hybrid_sedimentary_rock",
    ],
    [
      "Sedimentary>Siliciclastic",
      "rock.sedimentary.clastic_sedimentary_rock.siliciclastic_sedimentary_rock",
    ],
    ["Sedimentary>Volcaniclastic", "rock.sedimentary.volcaniclastic_rock"],
  ] as const)("should map the legacy leaf %s to %s", (legacy, path) => {
    expect(mapMaterial(legacy, "Rock")).toBe(path);
  });

  it.each([
    ["Xenolithic", "rock.xenolithic_rock"],
    [
      "Xenolithic>Igneous>Plutonic>Ultramafic",
      "rock.xenolithic_rock.igneous.plutonic.ultramafic",
    ],
    [
      "Xenolithic>Metamorphic>Gneiss",
      "rock.xenolithic_rock.metamorphic.strongly_metamorphosed.gneiss",
    ],
  ] as const)(
    "should root the xenolithic classification %s at %s",
    (legacy, path) => {
      expect(mapMaterial(legacy, "Rock")).toBe(path);
    },
  );

  it("should fall back to the material root when classification is absent", () => {
    expect(mapMaterial(null, "Sediment")).toBe("sediment");
  });

  it("should drop a classification the new tree cannot place, not coarsen it to the material root", () => {
    expect(mapMaterial("Ore>Oxide", "Ice")).toBe(null);
  });
});

describe("isKnownMaterialPath", () => {
  it.each([
    ["Igneous>Plutonic>Felsic", "Rock"], // whole path is a supported node
    ["Igneous>Plutonic", "Rock"], // incomplete but a valid prefix of complete paths
    ["Metamorphic", "Rock"], // genuinely coarse at the source
    ["Metamorphic>Gneiss", "Rock"], // legacy leaf remapped to its node in the new tree
    ["Sedimentary>Siliciclastic", "Rock"], // legacy leaf remapped to its node in the new tree
    ["Xenolithic>Igneous>Plutonic>Ultramafic", "Rock"], // rooted under rock.xenolithic_rock
    ["Xenolithic>Metamorphic>Gneiss", "Rock"], // xenolithic + remapped metamorphic leaf
    [null, "Rock"], // coarse root, source knew only "Rock"
  ] as const)("should import %s / %s", (classification, material) => {
    expect(isKnownMaterialPath(classification, material)).toBe(true);
  });

  it.each([
    ["Metamorphic>Granoblastite", "Rock"], // rock.metamorphic.granoblastite is not a supported path
    ["Metamorphic>MechanicallyBroken", "Rock"], // record to review, deliberately unmapped
    ["Metamorphic>Meta-Carbonate", "Rock"], // record to review, deliberately unmapped
    ["Metamorphic>Meta-Ultramafic", "Rock"], // record to review, deliberately unmapped
    ["Igneous>Volcanic>NotAThing", "Rock"], // fabricated leaf
    ["Xenolithic>Metamorphic>Metasomatic", "Rock"], // leaf with no node and no remap
    ["Ore>Sulfide", "Rock"],
    [null, "Soil"], // material_id the new roots lack
    [null, null],
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

describe("parseCollector", () => {
  it.each([
    {
      case: "a name with an inline ORCID",
      input: "Jostein Bakke (ORCID:0000-0001-6114-0400)",
      expected: { name: "Jostein Bakke", orcid: "0000-0001-6114-0400" },
    },
    {
      case: "a bare name",
      input: "Frederique Eynaud",
      expected: { name: "Frederique Eynaud", orcid: null },
    },
    {
      case: "an organization",
      input: "INSTITUT DE PHYSIQUE DU GLOBE DE PARIS",
      expected: { name: "INSTITUT DE PHYSIQUE DU GLOBE DE PARIS", orcid: null },
    },
    {
      case: "several names separated by semicolons",
      input: "NICOLAS Adolphe; BOUDIER Françoise",
      expected: { name: "NICOLAS Adolphe; BOUDIER Françoise", orcid: null },
    },
    {
      case: "a surname-comma-firstname",
      input: "BOIVIN, Pierre",
      expected: { name: "BOIVIN, Pierre", orcid: null },
    },
    {
      case: "several surname-comma-firstname names",
      input: "Andreani, M.; Escartin, J.",
      expected: { name: "Andreani, M.; Escartin, J.", orcid: null },
    },
    {
      case: "an empty value",
      input: "",
      expected: { name: null, orcid: null },
    },
  ])("should accept $case", ({ input, expected }) => {
    expect(parseCollector(input)).toEqual(expected);
  });

  it("should accept a null collector as empty", () => {
    expect(parseCollector(null)).toEqual({ name: null, orcid: null });
  });

  it.each([
    { case: "an open-ended list", input: "FEST, Helena et al." },
    { case: "a segment with more than one comma", input: "Staudacher, JS, DC" },
    {
      case: "a comma-separated pair of full names",
      input: "BRIOT Danielle, CANTAGREL Jean-Marie",
    },
    { case: "a malformed ORCID", input: "Cecile Grobois (ORCID:)" },
  ])("should reject $case", ({ input }) => {
    expect(parseCollector(input)).toEqual({ invalid: input });
  });
});

describe("mapSize", () => {
  it("should read a single number with a length unit as the length alone", () => {
    expect(mapSize("424.0", "centimeter")).toEqual({
      length: { value: 424, unit: "cm" },
    });
  });

  it("should read a pair as length x width", () => {
    expect(mapSize("9x5", "cm")).toEqual({
      length: { value: 9, unit: "cm" },
      width: { value: 5, unit: "cm" },
    });
  });

  it.each(["1x2x3", "1X2X3", " 1 x 2 x 3 ", "1.0x2x3"])(
    "should read %s as length x width x thickness",
    (size) => {
      expect(mapSize(size, "cm")).toEqual({
        length: { value: 1, unit: "cm" },
        width: { value: 2, unit: "cm" },
        thickness: { value: 3, unit: "cm" },
      });
    },
  );

  it.each(["8X2X0,5", "8x2x0.5", " 8 x 2 x 0,5 "])(
    "should read the comma in %s as a decimal separator",
    (size) => {
      expect(mapSize(size, "cm")).toEqual({
        length: { value: 8, unit: "cm" },
        width: { value: 2, unit: "cm" },
        thickness: { value: 0.5, unit: "cm" },
      });
    },
  );

  it("should treat a lone slash as no value", () => {
    expect(mapSize("/", "cm")).toEqual({});
  });

  it.each(["n/a", "1x2x3x4", "9x5x6cm", "0x2x3", "4,5x2,1,2", "2,5x2,0,5"])(
    "should return nothing for %s",
    (size) => {
      expect(mapSize(size, "cm")).toEqual({});
    },
  );
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

  it("should keep decimal precision", () => {
    expect(
      mapElevation(
        legacyRow({
          elevation: "1200.5",
          elevation_end: "1300.25",
          elevation_unit: "m",
        }),
      ),
    ).toEqual({
      min: 1200.5,
      max: 1300.25,
      unit: "m",
      datum: null,
    });
    expect(
      mapElevation(legacyRow({ bathy: "1200.5", bathy_unit: "m" })),
    ).toEqual({
      min: -1200.5,
      max: -1200.5,
      unit: "m",
      datum: "msl",
    });
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

describe("mapDoiLink", () => {
  it("should map a known citation to its verified DOI, keeping the citation as description", () => {
    const citation =
      "James, D.E., Boyd, F.R., Schutt, R., Bell, D.R., Carlson, R.W., (2004). Xenoltih constraints on seismic velocities.";
    expect(mapDoiLink(citation)).toEqual({
      url: "https://doi.org/10.1029/2003GC000551",
      description: citation,
    });
  });

  it("should map a bare DOI url with no description", () => {
    expect(mapDoiLink("https://doi.org/10.17600/18002387")).toEqual({
      url: "https://doi.org/10.17600/18002387",
      description: null,
    });
  });

  it("should override a fabricated per-sample DOI with the group's verified one", () => {
    const citation =
      "Boudier,F., Baronnet,A., Mainprice,D., Serpentine Mineral Replacements of Natural Olivine, Journal of Petrology, doi: 10.1093/petrology/egp107";
    expect(mapDoiLink(citation)).toEqual({
      url: "https://doi.org/10.1093/petrology/egp049",
      description: citation,
    });
  });

  it("should return null for a citation outside the reviewed groups", () => {
    expect(mapDoiLink("Smith, J. (1999). Some unreviewed paper.")).toBeNull();
  });
});

describe("droppedDoiLinks", () => {
  it("should return only the citations outside the reviewed groups", () => {
    expect(
      droppedDoiLinks([
        "https://doi.org/10.17600/18002387",
        "Smith, J. (1999). Some unreviewed paper.",
      ]),
    ).toEqual(["Smith, J. (1999). Some unreviewed paper."]);
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

  it("should keep the sample, without links, when its only citation is unreviewed", () => {
    const row = legacyRow({
      doi_related_resources: ["Smith, J. (1999). Some unreviewed paper."],
    });
    const result = createSampleSchema.safeParse(toCreateSample(row));
    expect(result.success).toBe(true);
    expect(result.data?.links).toBeUndefined();
  });

  it("should carry the DOI links, deduplicated by url", () => {
    const row = legacyRow({
      doi_related_resources: [
        "https://doi.org/10.17600/18002387",
        "https://doi.org/10.17600/18002387",
        "James, D.E., Boyd, F.R., Schutt, R., Bell, D.R., Carlson, R.W., (2004). Xenoltih constraints on seismic velocities.",
      ],
    });
    const result = createSampleSchema.safeParse(toCreateSample(row));
    expect(result).toMatchObject({
      success: true,
      data: {
        links: [
          { url: "https://doi.org/10.17600/18002387", description: null },
          {
            url: "https://doi.org/10.1029/2003GC000551",
            description: expect.stringContaining("James, D.E."),
          },
        ],
      },
    });
  });
});

describe("unmappableValues", () => {
  const goodRow = (overrides: Partial<LegacyRow> = {}) =>
    legacyRow({ classification: "Igneous>Plutonic>Felsic", ...overrides });

  it("should flag nothing when every controlled value maps", () => {
    expect(unmappableValues(goodRow())).toEqual([]);
  });

  it.each([
    {
      case: "an unplaceable material classification",
      overrides: { classification: "Ore>Oxide", material: "Rock" },
      expected: { field: "material", value: "Ore>Oxide" },
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
      case: "a collector we cannot parse",
      overrides: { collector: "FEST, Helena et al." },
      expected: { field: "collector", value: "FEST, Helena et al." },
    },
    {
      case: "a size that is not one, two or three numbers",
      overrides: { size: "1x2x3x4", size_unit: "cm" },
      expected: { field: "size", value: "1x2x3x4" },
    },
    {
      case: "an unknown size unit paired with a dimension triple",
      overrides: { size: "1x2x3", size_unit: "furlong" },
      expected: { field: "size_unit", value: "furlong" },
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

  it("should not flag a DOI related resource outside the reviewed groups", () => {
    expect(
      unmappableValues(
        goodRow({
          doi_related_resources: ["Smith, J. (1999). Some unreviewed paper."],
        }),
      ),
    ).toEqual([]);
  });

  it("should not flag a physical-form resource type that maps to a nature", () => {
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

describe("toOwner", () => {
  it("should map the owner email and names", () => {
    expect(
      toOwner(
        legacyRow({
          owner_email: "jane.doe@cnrs.fr",
          owner_first_name: "Jane",
          owner_last_name: "Doe",
        }),
      ),
    ).toEqual({ email: "jane.doe@cnrs.fr", firstname: "Jane", name: "Doe" });
  });

  it("should null blank names", () => {
    expect(
      toOwner(
        legacyRow({
          owner_email: "lab@cnrs.fr",
          owner_first_name: "",
          owner_last_name: " ",
        }),
      ),
    ).toEqual({ email: "lab@cnrs.fr", firstname: null, name: null });
  });

  it.each([null, "", "  "])(
    "should return null when the email is %j",
    (email) => {
      expect(toOwner(legacyRow({ owner_email: email }))).toBeNull();
    },
  );
});
