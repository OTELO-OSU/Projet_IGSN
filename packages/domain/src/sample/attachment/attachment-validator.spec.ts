import {
  ATTACHMENT_MAX_BYTES,
  uploadSampleAttachmentSchema,
} from "./attachment-validator";

function file(name: string, bytes = 4, type = "application/octet-stream") {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("uploadSampleAttachmentSchema", () => {
  it("should accept a file with a description", () => {
    // Arrange / Act
    const result = uploadSampleAttachmentSchema.safeParse({
      file: file("report.pdf", 4, "application/pdf"),
      description: "XRF analysis report",
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    // Any file type is accepted, extension or not.
    "report.pdf",
    "field-footage.mp4",
    "recording.wav",
    "dataset.zip",
    "readme",
  ])("should accept %s without a description", (name) => {
    // Arrange / Act
    const result = uploadSampleAttachmentSchema.safeParse({
      file: file(name),
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it("should reject a file above the size cap", () => {
    // Arrange / Act
    const result = uploadSampleAttachmentSchema.safeParse({
      file: file("footage.mp4", ATTACHMENT_MAX_BYTES + 1),
    });
    // Assert
    expect(result.success).toBe(false);
  });

  it.each([
    // A description never comes without its file.
    { description: "orphan description" },
    { file: file("report.pdf"), description: "" },
    { file: "not-a-file" },
    // Unknown keys are rejected (strict object).
    { file: file("report.pdf"), label: "x" },
    {},
  ])("should reject invalid upload input #%#", (input) => {
    // Arrange / Act
    const result = uploadSampleAttachmentSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });
});
