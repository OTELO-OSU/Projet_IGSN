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
  repository: null,
  scientificContext: null,
  age: null,
  security: null,
  existenceStatus: "exists",
  availabilityStatus: "available",
  publicationYear: null,
  resourceType: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: null,
  status: "draft",
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
      repository: null,
      geologicalContextDescription: null,
      geomorphologicalEnvironment: null,
      scientificContext: null,
      syntheticDetails: null,
      age: null,
      links: [],
      attachments: [],
      security: null,
      existenceStatus: "exists",
      availabilityStatus: "available",
      publicationYear: null,
      resourceType: null,
      economicInterestElements: [],
      economicResourceTypePrecision: null,
      economicDepositName: null,
      economicDepositDescription: null,
      igsn: null,
      owner: null,
      manualGroups: [],
      institutionalOrganization: null,
      institutionalOsu: null,
      institutionalLaboratory: null,
      status: "draft",
      createdAt: new Date("2026-07-02T10:00:00.000Z"),
      updatedAt: new Date("2026-07-02T10:00:00.000Z"),
    });
  });

  it.each([
    { ...validSample, name: "   " },
    { ...validSample, nature: "Thin section" },
    { ...validSample, id: "not-a-uuid" },
    { ...validSample, status: "archived" },
    { ...validSample, igsn: "not-an-igsn" },
    { ...validSample, type: "half_round" },
    { ...validSample, collectionMethod: "gravity_corer" },
    { ...validSample, collectionMethodDescription: "   " },
    { ...validSample, specificName: "   " },
  ])("should reject an invalid sample #%#", (input) => {
    // Arrange / Act
    const result = sampleSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });
});

describe("createSampleSchema", () => {
  it.each([
    { type: "dredge" },
    { collectionMethod: "coring.gravity_corer.giant" },
    { collectionMethodDescription: "Collected at low tide, 30 cm depth" },
    { specificName: "FTB-2026-042" },
    {
      resourceType: "mineral_and_ore.uranium.sandstone",
      economicInterestElements: ["u", "fe"],
      economicResourceTypePrecision: "high-grade ore",
      economicDepositName: "Cigar Lake",
      economicDepositDescription: "Unconformity-related uranium deposit",
    },
  ])("should accept and echo the explicit optional fields #%#", (extra) => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      ...extra,
    });
    // Assert
    expect(result).toEqual({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      ...extra,
    });
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

  it("should accept a texture valid for the plutonic material branch", () => {
    const result = createSampleSchema.safeParse({
      name: "Granite 1",
      nature: "hand_sample",
      material: "rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic",
    });
    expect(result).toMatchObject({ success: true });
  });

  it.each([
    { material: "rock.igneous.plutonic.felsic.granite", texture: "glassy" },
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

  it("should accept a synthetic material without a location", () => {
    const result = createSampleSchema.safeParse({
      name: "Synthetic 1",
      nature: "hand_sample",
      material: "synthetic_rock_mineral",
    });
    expect(result).toMatchObject({ success: true });
  });

  it.each([
    [
      "synthetic_rock_mineral",
      { location: { position: { type: "point", longitude: 0, latitude: 0 } } },
    ],
    [
      "synthetic_rock_mineral",
      { geologicalContextDescription: "Basaltic plateau carved by the river" },
    ],
    ["synthetic_rock_mineral", { geomorphologicalEnvironment: "marine_zone" }],
    [
      "extraterrestrial_rock.returned_samples.lunar_sample",
      { location: { position: { type: "point", longitude: 0, latitude: 0 } } },
    ],
  ] as const)(
    "should reject a %s material carrying a geological context %o",
    (material, extra) => {
      const result = createSampleSchema.safeParse({
        name: "Synthetic 1",
        nature: "hand_sample",
        material,
        ...extra,
      });
      expect(result.success).toBe(false);
    },
  );

  it("should accept synthetic details on a synthetic material", () => {
    const result = createSampleSchema.safeParse({
      name: "Synthetic 1",
      nature: "hand_sample",
      material: "synthetic_rock_mineral",
      syntheticDetails: { finalProduct: "glass" },
    });
    expect(result).toMatchObject({ success: true });
  });

  it.each(["rock.igneous.plutonic.felsic.granite", null])(
    "should reject synthetic details on the non-synthetic material %s",
    (material) => {
      const result = createSampleSchema.safeParse({
        name: "Granite 1",
        nature: "hand_sample",
        material,
        syntheticDetails: { finalProduct: "glass" },
      });
      expect(result.success).toBe(false);
    },
  );

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

  it("should reject an availability status the existence status forbids", () => {
    // Arrange / Act
    const result = createSampleSchema.safeParse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      existenceStatus: "consumed",
      availabilityStatus: "available",
    });
    // Assert
    expect(result.error?.issues).toMatchObject([
      { path: ["availabilityStatus"] },
    ]);
  });

  it("should accept an existence status with no availability status", () => {
    // Arrange / Act
    const result = createSampleSchema.safeParse({
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      existenceStatus: "consumed",
    });
    // Assert
    expect(result).toMatchObject({ success: true });
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
