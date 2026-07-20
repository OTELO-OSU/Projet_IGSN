import { createSampleLinkSchema, sampleLinkSchema } from "./model";

const validLink = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  url: "https://doi.org/10.1594/IEDA.100252",
  description: "Related IEDA dataset",
};

describe("sampleLinkSchema", () => {
  it("should accept a DOI link with a description", () => {
    // Arrange / Act
    const result = sampleLinkSchema.parse(validLink);
    // Assert
    expect(result).toEqual(validLink);
  });

  it("should accept a DOI link without a description", () => {
    // Arrange / Act
    const result = sampleLinkSchema.parse({ ...validLink, description: null });
    // Assert
    expect(result).toEqual({ ...validLink, description: null });
  });

  it.each([
    // Only DOI urls are accepted, in their canonical https://doi.org form.
    { ...validLink, url: "https://example.com/10.1594/IEDA.100252" },
    { ...validLink, url: "http://doi.org/10.1594/IEDA.100252" },
    { ...validLink, url: "https://doi.org/" },
    { ...validLink, url: "https://doi.org/11.1594/IEDA.100252" },
    { ...validLink, url: "https://doi.org/10.1594/" },
    { ...validLink, url: "https://doi.org/10.1594/IEDA 100252" },
    { ...validLink, url: "10.1594/IEDA.100252" },
    { ...validLink, url: "" },
    { ...validLink, id: "not-a-uuid" },
    { ...validLink, description: "" },
    { ...validLink, description: "   " },
  ])("should reject an invalid link #%#", (input) => {
    // Arrange / Act
    const result = sampleLinkSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });
});

describe("createSampleLinkSchema", () => {
  it("should accept a url alone", () => {
    // Arrange / Act
    const result = createSampleLinkSchema.safeParse({
      url: "https://doi.org/10.1594/IEDA.100252",
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it("should trim the url", () => {
    // Arrange / Act
    const result = createSampleLinkSchema.parse({
      url: "  https://doi.org/10.1594/IEDA.100252  ",
    });
    // Assert
    expect(result).toEqual({ url: "https://doi.org/10.1594/IEDA.100252" });
  });

  it.each([
    // A description never comes without its url.
    { description: "Related dataset" },
    { url: "https://example.com/paper", description: "Related dataset" },
    { url: "https://doi.org/10.1594/IEDA.100252", description: "" },
    // Unknown keys are rejected (strict object).
    { url: "https://doi.org/10.1594/IEDA.100252", label: "x" },
  ])("should reject invalid create input #%#", (input) => {
    // Arrange / Act
    const result = createSampleLinkSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });
});
