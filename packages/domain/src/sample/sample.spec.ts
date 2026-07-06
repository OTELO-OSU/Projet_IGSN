import { NATURES } from "./nature";
import { createSampleSchema, sampleSchema } from "./sample";

const validSample = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Basalte du Massif Central",
  nature: "thin_section",
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
      igsn: null,
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
    expect(result).toEqual({ name: "Grès de Fontainebleau", nature });
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
    });
  });

  it.each([
    { name: "", nature: "rock_powder" },
    { name: "Grès", nature: "Roche inconnue" },
    { nature: "rock_powder" },
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
