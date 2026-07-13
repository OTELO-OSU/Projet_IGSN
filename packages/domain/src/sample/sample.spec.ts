import { NATURES } from "./nature";
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
      igsn: null,
      published: false,
      createdAt: new Date("2026-07-02T10:00:00.000Z"),
      updatedAt: new Date("2026-07-02T10:00:00.000Z"),
    });
  });

  it("should accept a collection method description", () => {
    // Act
    const result = sampleSchema.safeParse({
      ...validSample,
      collectionMethodDescription: "Collected at low tide, 30 cm depth",
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it("should accept a null type (not classified yet)", () => {
    // Act
    const result = sampleSchema.safeParse({ ...validSample, type: null });
    // Assert
    expect(result.success).toBe(true);
  });

  it("should accept a sample with a location", () => {
    // Act
    const result = sampleSchema.safeParse({
      ...validSample,
      location: {
        position: {
          type: "area",
          westLongitude: 5,
          eastLongitude: 8,
          southLatitude: 44,
          northLatitude: 46,
        },
      },
    });
    // Assert
    expect(result.success).toBe(true);
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

  it("should reject a sample missing its name", () => {
    // Arrange / Act
    const result = sampleSchema.safeParse({
      id: validSample.id,
      nature: validSample.nature,
      createdAt: validSample.createdAt,
      updatedAt: validSample.updatedAt,
    });
    // Assert
    expect(result.success).toBe(false);
  });
});

describe("createSampleSchema", () => {
  it.each(NATURES)("should accept a name and the nature %s", (nature) => {
    // Arrange / Act
    const result = createSampleSchema.parse({
      name: "Grès de Fontainebleau",
      nature,
    });
    // Assert
    expect(result).toEqual({
      name: "Grès de Fontainebleau",
      nature,
      type: null,
    });
  });

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
    // A plutonic-only texture under a volcanic material.
    { material: "rock.igneous.volcanic.mafic.basalt", texture: "cumulate" },
    // A volcanic-only texture under a plutonic material.
    { material: "rock.igneous.plutonic.felsic.granite", texture: "glassy" },
    // A texture with no igneous branch selected.
    { material: "rock.igneous", texture: "phaneritic" },
    // A texture with a non-igneous material.
    { material: "rock.sedimentary.microbialite", texture: "phaneritic" },
    // A texture with no material at all.
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
    // A facies with a non-metamorphic material.
    {
      material: "rock.igneous.plutonic.felsic.granite",
      metamorphicFacies: "amphibolite",
    },
    // A facies with no material at all.
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
    // strictObject: unknown keys are rejected.
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
    // unknown vocabulary codes
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
