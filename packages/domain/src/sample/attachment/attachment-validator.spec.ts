import {
  ATTACHMENT_MAX_BYTES,
  hasAllowedAttachmentExtension,
  uploadSampleAttachmentSchema,
} from "./attachment-validator";

function file(name: string, bytes = 4, type = "application/octet-stream") {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("hasAllowedAttachmentExtension", () => {
  it.each([
    "report.pdf",
    "data.csv",
    "data.xls",
    "data.xlsx",
    "notes.txt",
    "photo.jpg",
    "photo.jpeg",
    "photo.png",
    "figure.svg",
    // Extension match is case-insensitive.
    "Photo.JPG",
  ])("should accept %s", (name) => {
    expect(hasAllowedAttachmentExtension(name)).toBe(true);
  });

  it.each(["malware.exe", "page.html", "archive", "pdf", ".pdf.exe"])(
    "should reject %s",
    (name) => {
      expect(hasAllowedAttachmentExtension(name)).toBe(false);
    },
  );
});

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

  it("should accept a file without a description", () => {
    // Arrange / Act
    const result = uploadSampleAttachmentSchema.safeParse({
      file: file("report.pdf"),
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it("should reject a file above the size cap", () => {
    // Arrange / Act
    const result = uploadSampleAttachmentSchema.safeParse({
      file: file("report.pdf", ATTACHMENT_MAX_BYTES + 1),
    });
    // Assert
    expect(result.success).toBe(false);
  });

  it.each([
    // A description never comes without its file.
    { description: "orphan description" },
    { file: file("malware.exe") },
    { file: file("report.pdf"), description: "" },
    { file: "not-a-file" },
    {},
  ])("should reject invalid upload input #%#", (input) => {
    // Arrange / Act
    const result = uploadSampleAttachmentSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });
});
