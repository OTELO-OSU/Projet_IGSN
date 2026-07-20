import { sampleAttachmentSchema } from "./model";

const validAttachment = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "thin-section-analysis.pdf",
  mediaType: "application/pdf",
  sizeBytes: 12345,
  description: "XRF analysis report",
};

describe("sampleAttachmentSchema", () => {
  it("should accept a valid attachment", () => {
    // Arrange / Act
    const result = sampleAttachmentSchema.parse(validAttachment);
    // Assert
    expect(result).toEqual(validAttachment);
  });

  it("should accept an attachment without a description", () => {
    // Arrange / Act
    const result = sampleAttachmentSchema.safeParse({
      ...validAttachment,
      description: null,
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    { ...validAttachment, id: "not-a-uuid" },
    { ...validAttachment, name: "" },
    { ...validAttachment, mediaType: "" },
    { ...validAttachment, sizeBytes: 0 },
    { ...validAttachment, sizeBytes: -1 },
    { ...validAttachment, sizeBytes: 1.5 },
    { ...validAttachment, description: "" },
    { ...validAttachment, description: "   " },
  ])("should reject an invalid attachment #%#", (input) => {
    // Arrange / Act
    const result = sampleAttachmentSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });
});
