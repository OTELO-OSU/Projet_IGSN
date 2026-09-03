import { createSampleRelationSchema, sampleRelationSchema } from "./model";

const relation = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  relationType: "references",
  identifierType: "doi",
  identifier: "https://doi.org/10.1594/IEDA.100252",
  targetTitle: "IEDA companion dataset",
  targetResourceType: "dataset",
  relationTypeInformation: null,
  relatedMetadataScheme: null,
  schemeURI: null,
  schemeType: null,
  description: "Related IEDA dataset",
} as const;

const issuePaths = (input: unknown): PropertyKey[][] => {
  const result = sampleRelationSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path);
};

describe("sampleRelationSchema", () => {
  it("should accept a fully described relation", () => {
    // Arrange / Act
    const result = sampleRelationSchema.parse(relation);
    // Assert
    expect(result).toEqual(relation);
  });

  it.each(["https://doi.org/10.1594/IEDA.100252", "doi:10.1594/IEDA.100252"])(
    "should accept a doi relation pointing at a DOI: %s",
    (identifier) => {
      // Arrange / Act
      const result = sampleRelationSchema.safeParse({
        ...relation,
        identifier,
      });
      // Assert
      expect(result.success).toBe(true);
    },
  );

  it.each(["https://example.com/paper", "doi:foo"])(
    "should reject a doi relation whose target is not a DOI: %s",
    (identifier) => {
      // Arrange / Act
      const paths = issuePaths({ ...relation, identifier });
      // Assert
      expect(paths).toEqual([["identifier"]]);
    },
  );

  it("should accept a url relation pointing at a valid URL", () => {
    // Arrange / Act
    const result = sampleRelationSchema.safeParse({
      ...relation,
      identifierType: "url",
      identifier: "https://example.com/paper",
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it.each(["not a url", "javascript:alert(1)", "data:text/html,x"])(
    "should reject a url relation whose target is not a navigable http URL: %s",
    (identifier) => {
      // Arrange / Act
      const paths = issuePaths({
        ...relation,
        identifierType: "url",
        identifier,
      });
      // Assert
      expect(paths).toEqual([["identifier"]]);
    },
  );

  it.each(["bibcode", "pmid", "purl", "w3id"] as const)(
    "should accept a %s relation pointing at an opaque identifier",
    (identifierType) => {
      // Arrange / Act
      const result = sampleRelationSchema.safeParse({
        ...relation,
        identifierType,
        identifier: "2019AGUFM.V51A0034J",
      });
      // Assert
      expect(result.success).toBe(true);
    },
  );

  it.each([
    "wj7t9pnc2vfxr4bkq5hy3m8ge0",
    "WJ7T9PNC2VFXR4BKQ5HY3M8GE0",
    "CNRS0000000001",
  ])("should accept an igsn relation pointing at an IGSN: %s", (identifier) => {
    // Arrange / Act
    const result = sampleRelationSchema.safeParse({
      ...relation,
      identifierType: "igsn",
      identifier,
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it("should reject an igsn relation whose target is not an IGSN", () => {
    // Arrange / Act
    const paths = issuePaths({
      ...relation,
      identifierType: "igsn",
      identifier: "2019AGUFM.V51A0034J",
    });
    // Assert
    expect(paths).toEqual([["identifier"]]);
  });

  it.each(["", "   "])("should reject an empty target #%#", (identifier) => {
    // Arrange / Act
    const result = sampleRelationSchema.safeParse({
      ...relation,
      identifierType: "bibcode",
      identifier,
    });
    // Assert
    expect(result.success).toBe(false);
  });

  it.each(["", "   ", null, undefined])(
    "should reject a relation without a title #%#",
    (targetTitle) => {
      // Arrange / Act
      const paths = issuePaths({ ...relation, targetTitle });
      // Assert
      expect(paths).toEqual([["targetTitle"]]);
    },
  );

  it.each([
    { relatedMetadataScheme: "citeproc+json" },
    { schemeURI: "https://github.com/citation-style-language/schema" },
    { schemeType: "Turtle" },
  ])("should reject a scheme field without has_metadata #%#", (scheme) => {
    // Arrange / Act
    const paths = issuePaths({ ...relation, relationType: "other", ...scheme });
    // Assert
    expect(paths).toEqual([["relatedMetadataScheme"]]);
  });

  it("should accept the scheme fields with has_metadata", () => {
    // Arrange / Act
    const result = sampleRelationSchema.safeParse({
      ...relation,
      relationType: "has_metadata",
      relatedMetadataScheme: "citeproc+json",
      schemeURI: "https://github.com/citation-style-language/schema",
      schemeType: "Turtle",
    });
    // Assert
    expect(result.success).toBe(true);
  });
});

describe("createSampleRelationSchema", () => {
  it("should accept a relation type, identifier type, target and title alone", () => {
    // Arrange / Act
    const result = createSampleRelationSchema.parse({
      relationType: "references",
      identifierType: "doi",
      identifier: "  https://doi.org/10.1594/IEDA.100252  ",
      targetTitle: "IEDA companion dataset",
    });
    // Assert
    expect(result).toEqual({
      relationType: "references",
      identifierType: "doi",
      identifier: "https://doi.org/10.1594/IEDA.100252",
      targetTitle: "IEDA companion dataset",
    });
  });

  it("should reject a relation without a title", () => {
    // Arrange / Act
    const result = createSampleRelationSchema.safeParse({
      relationType: "references",
      identifierType: "doi",
      identifier: "https://doi.org/10.1594/IEDA.100252",
    });
    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject an unknown key", () => {
    // Arrange / Act
    const result = createSampleRelationSchema.safeParse({
      relationType: "references",
      identifierType: "doi",
      identifier: "https://doi.org/10.1594/IEDA.100252",
      targetTitle: "IEDA companion dataset",
      url: "https://example.com/x",
    });
    // Assert
    expect(result.success).toBe(false);
  });
});
