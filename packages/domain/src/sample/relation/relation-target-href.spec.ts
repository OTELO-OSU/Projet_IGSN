import { relationTargetHref } from "./relation-target-href";

describe("relationTargetHref", () => {
  it("should turn a plain doi target into a doi.org url", () => {
    // Arrange / Act
    const href = relationTargetHref("doi:10.1594/IEDA.100252");
    // Assert
    expect(href).toBe("https://doi.org/10.1594/IEDA.100252");
  });

  it("should keep a navigable url as is", () => {
    // Arrange / Act
    const href = relationTargetHref("https://example.org/x");
    // Assert
    expect(href).toBe("https://example.org/x");
  });

  it.each(["javascript:alert(1)", "2019AGUFM.V51A0034J"])(
    "should return null for a target that cannot be navigated to: %s",
    (identifier) => {
      // Arrange / Act
      const href = relationTargetHref(identifier);
      // Assert
      expect(href).toBeNull();
    },
  );
});
