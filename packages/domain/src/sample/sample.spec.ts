import { NATURES } from "./nature";
import { createSampleSchema, sampleSchema } from "./sample";

const validSample = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: "core.section",
  material: null,
  collectionMethod: "coring.gravity_corer",
  specificName: null,
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
      collectionMethod: "coring.gravity_corer",
      specificName: null,
      igsn: null,
      published: false,
      createdAt: new Date("2026-07-02T10:00:00.000Z"),
      updatedAt: new Date("2026-07-02T10:00:00.000Z"),
    });
  });

  it("should accept a null type (not classified yet)", () => {
    // Act
    const result = sampleSchema.safeParse({ ...validSample, type: null });
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

  it.each([
    { name: "", nature: "rock_powder" },
    { name: "Grès", nature: "Roche inconnue" },
    { nature: "rock_powder" },
    { name: "Grès", nature: "rock_powder", type: "half_round" },
    // unknown vocabulary codes
    { name: "Grès", nature: "rock_powder", material: "lava" },
    { name: "Grès", nature: "rock_powder", collectionMethod: "gravity_corer" },
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
