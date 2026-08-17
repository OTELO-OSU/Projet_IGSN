import { createSampleSchema, sampleSchema } from "./sample";

const validSample = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: "core.section",
  material: null,
  texture: null,
  metamorphicFacies: null,
  collectionMethod: "coring.gravity_corer",
  collectionMethodDescription: null,
  specificName: null,
  location: null,
  description: null,
  condition: null,
  scientificContext: null,
  age: null,
  security: null,
  availability: "exists",
  publicationYear: null,
  economicInterest: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: null,
  published: false,
  createdAt: "2026-07-02T10:00:00.000Z",
  updatedAt: "2026-07-02T10:00:00.000Z",
};

describe("sampleSchema", () => {
  it("should accept a valid sample and coerce ISO date strings to Date", () => {
    // Arrange / Act
    const result = sampleSchema.parse(validSample);
    // Assert
    expect(result).toEqual({
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: "core.section",
      material: null,
      texture: null,
      metamorphicFacies: null,
      collectionMethod: "coring.gravity_corer",
      collectionMethodDescription: null,
      specificName: null,
      location: null,
      description: null,
      condition: null,
      scientificContext: null,
      age: null,
      links: [],
      attachments: [],
      security: null,
      availability: "exists",
      publicationYear: null,
      economicInterest: null,
      economicInterestElements: [],
      economicResourceTypePrecision: null,
      economicDepositName: null,
      economicDepositDescription: null,
      igsn: null,
      manualGroups: [],
      institutionalOrganization: null,
      institutionalOsu: null,
      institutionalLaboratory: null,
      published: false,
      createdAt: new Date("2026-07-02T10:00:00.000Z"),
      updatedAt: new Date("2026-07-02T10:00:00.000Z"),
    });
  });

  it.each([
    { ...validSample, name: "" },
    { ...validSample, name: "   " },
    { ...validSample, nature: "Thin section" },
    { ...validSample, id: "not-a-uuid" },
    { ...validSample, published: "yes" },
    { ...validSample, igsn: "not-an-igsn" },
    { ...validSample, type: "half_round" },
    { ...validSample, collectionMethod: "gravity_corer" },
    { ...validSample, collectionMethodDescription: "" },
    { ...validSample, collectionMethodDescription: "   " },
    { ...validSample, specificName: "" },
    { ...validSample, specificName: "   " },
  ])("should reject an invalid sample #%#", (input) => {
    // Arrange / Act
    const result = sampleSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });
});

describe("createSampleSchema", () => {
  it("should accept an explicit type", () => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: "dredge",
    });
    // Assert
    expect(result).toEqual({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: "dredge",
    });
  });

  it("should accept an explicit collection method", () => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      collectionMethod: "coring.gravity_corer.giant",
    });
    // Assert
    expect(result).toEqual({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      collectionMethod: "coring.gravity_corer.giant",
    });
  });

  it("should accept an explicit collection method description", () => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      collectionMethodDescription: "Collected at low tide, 30 cm depth",
    });
    // Assert
    expect(result).toEqual({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      collectionMethodDescription: "Collected at low tide, 30 cm depth",
    });
  });

  it("should accept an explicit specific name", () => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      specificName: "FTB-2026-042",
    });
    // Assert
    expect(result).toEqual({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      specificName: "FTB-2026-042",
    });
  });

  it("should accept an explicit age", () => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      age: {
        numericAgeMin: 12000,
        numericAgeMax: 12000,
        numericAgeUnit: "a",
        numericAgeYearsUnit: "bp",
      },
    });
    // Assert
    expect(result).toMatchObject({
      age: {
        numericAgeMin: 12000,
        numericAgeMax: 12000,
        numericAgeUnit: "a",
        numericAgeYearsUnit: "bp",
      },
    });
  });

  it("should accept explicit links", () => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      links: [
        { url: "https://doi.org/10.1594/IEDA.100252" },
        {
          url: "https://doi.org/10.5880/GFZ.2026.001",
          description: "Companion dataset",
        },
      ],
    });
    // Assert
    expect(result.links).toEqual([
      { url: "https://doi.org/10.1594/IEDA.100252" },
      {
        url: "https://doi.org/10.5880/GFZ.2026.001",
        description: "Companion dataset",
      },
    ]);
  });

  it("should accept an explicit economic interest", () => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      economicInterest: "yes.mineral_and_ore.uranium.sandstone",
      economicInterestElements: ["u", "fe"],
      economicResourceTypePrecision: "high-grade ore",
      economicDepositName: "Cigar Lake",
      economicDepositDescription: "Unconformity-related uranium deposit",
    });
    // Assert
    expect(result).toMatchObject({
      economicInterest: "yes.mineral_and_ore.uranium.sandstone",
      economicInterestElements: ["u", "fe"],
      economicResourceTypePrecision: "high-grade ore",
      economicDepositName: "Cigar Lake",
      economicDepositDescription: "Unconformity-related uranium deposit",
    });
  });

  it("should reject an unknown economic interest path", () => {
    // Arrange / Act
    const result = createSampleSchema.safeParse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      economicInterest: "yes.mineral_and_ore.unobtanium",
    });
    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject an unknown economic interest element", () => {
    // Arrange / Act
    const result = createSampleSchema.safeParse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      economicInterestElements: ["fe", "xx"],
    });
    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject a link that is not a DOI url", () => {
    // Arrange / Act
    const result = createSampleSchema.safeParse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      links: [{ url: "https://example.com/paper" }],
    });
    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject an age with an inverted numeric range", () => {
    // Arrange / Act
    const result = createSampleSchema.safeParse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      age: { numericAgeMin: 140, numericAgeMax: 100 },
    });
    // Assert
    expect(result.success).toBe(false);
  });

  it("should default a missing type to null", () => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
    });
    // Assert
    expect(result.type).toBeNull();
  });

  it("should trim the name", () => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "  Grès de Fontainebleau  ",
      nature: "rock_powder",
    });
    // Assert
    expect(result).toEqual({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
    });
  });

  it("should accept a create payload with a material path and no rockType", () => {
    const result = createSampleSchema.safeParse({
      name: "Basalt 42",
      nature: "hand_sample",
      material: "rock.igneous",
    });
    expect(result).toMatchObject({ success: true });
  });

  it("should accept a texture valid for the plutonic material branch", () => {
    const result = createSampleSchema.safeParse({
      name: "Granite 1",
      nature: "hand_sample",
      material: "rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic",
    });
    expect(result).toMatchObject({ success: true });
  });

  it("should accept porphyritic under a volcanic material (shared texture)", () => {
    const result = createSampleSchema.safeParse({
      name: "Basalt 1",
      nature: "hand_sample",
      material: "rock.igneous.volcanic.mafic.basalt",
      texture: "porphyritic",
    });
    expect(result).toMatchObject({ success: true });
  });

  it.each([
    { material: "rock.igneous.volcanic.mafic.basalt", texture: "cumulate" },
    { material: "rock.igneous.plutonic.felsic.granite", texture: "glassy" },
    { material: "rock.igneous", texture: "phaneritic" },
    { material: "rock.sedimentary.microbialite", texture: "phaneritic" },
    { material: null, texture: "phaneritic" },
  ])(
    "should reject a texture inconsistent with the material %o",
    ({ material, texture }) => {
      const result = createSampleSchema.safeParse({
        name: "Sample",
        nature: "hand_sample",
        material,
        texture,
      });
      expect(result.success).toBe(false);
    },
  );

  it("should accept a metamorphic facies for a metamorphic material", () => {
    const result = createSampleSchema.safeParse({
      name: "Gneiss 1",
      nature: "hand_sample",
      material: "rock.metamorphic.strongly_metamorphosed.gneiss",
      metamorphicFacies: "amphibolite",
    });
    expect(result).toMatchObject({ success: true });
  });

  it.each([
    {
      material: "rock.igneous.plutonic.felsic.granite",
      metamorphicFacies: "amphibolite",
    },
    { material: null, metamorphicFacies: "amphibolite" },
  ])(
    "should reject a metamorphic facies inconsistent with the material %o",
    ({ material, metamorphicFacies }) => {
      const result = createSampleSchema.safeParse({
        name: "Sample",
        nature: "hand_sample",
        material,
        metamorphicFacies,
      });
      expect(result.success).toBe(false);
    },
  );

  it("should reject a create payload carrying an unknown rockType field", () => {
    const result = createSampleSchema.safeParse({
      name: "Basalt 42",
      nature: "hand_sample",
      material: "rock",
      rockType: "igneous",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an unknown material path", () => {
    const result = createSampleSchema.safeParse({
      name: "Basalt 42",
      nature: "hand_sample",
      material: "gemstone",
    });
    expect(result.success).toBe(false);
  });

  it("should accept a create payload with a location", () => {
    const result = createSampleSchema.safeParse({
      name: "Basalt 42",
      nature: "hand_sample",
      location: {
        position: { type: "point", longitude: 2.35, latitude: 48.85 },
      },
    });
    expect(result).toMatchObject({ success: true });
  });

  it("should accept a synthetic material without a location", () => {
    const result = createSampleSchema.safeParse({
      name: "Synthetic 1",
      nature: "hand_sample",
      material: "synthetic_rock_mineral",
    });
    expect(result).toMatchObject({ success: true });
  });

  it("should reject a synthetic material carrying a location", () => {
    const result = createSampleSchema.safeParse({
      name: "Synthetic 1",
      nature: "hand_sample",
      material: "synthetic_rock_mineral",
      location: { position: { type: "point", longitude: 0, latitude: 0 } },
    });
    expect(result.success).toBe(false);
  });

  it.each([
    { name: "", nature: "rock_powder" },
    { name: "Grès", nature: "Roche inconnue" },
    { nature: "rock_powder" },
    { name: "Grès", nature: "rock_powder", type: "half_round" },
    { name: "Grès", nature: "rock_powder", material: "lava" },
    { name: "Grès", nature: "rock_powder", collectionMethod: "gravity_corer" },
    {
      name: "Grès",
      nature: "rock_powder",
      collectionMethodDescription: "",
    },
    { name: "Grès", nature: "rock_powder", specificName: "" },
  ])("should reject invalid create input #%#", (input) => {
    // Arrange / Act
    const result = createSampleSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject unknown fields", () => {
    // Arrange / Act
    const result = createSampleSchema.safeParse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    });
    // Assert
    expect(result.success).toBe(false);
  });
});
