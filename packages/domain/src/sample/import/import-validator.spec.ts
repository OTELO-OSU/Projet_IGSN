import { XLSX_MEDIA_TYPE, importSamplesSchema } from "./import-validator.ts";

function file(name: string) {
  return new File([new Uint8Array(4)], name, { type: XLSX_MEDIA_TYPE });
}

const firstId = "0b4f3c1e-8a2d-4c6b-9e7f-1a2b3c4d5e6f";
const secondId = "7d9e2f4a-1b3c-4d5e-8f6a-9b0c1d2e3f4a";

describe("importSamplesSchema", () => {
  it.each(["samples.xlsx", "FOO.XLSX"])(
    "should accept the xlsx workbook %s without staged uploads",
    (name) => {
      // Arrange / Act
      const result = importSamplesSchema.safeParse({ file: file(name) });
      // Assert
      expect(result.success).toBe(true);
    },
  );

  it("should accept staged upload ids alongside the workbook", () => {
    // Arrange / Act
    const result = importSamplesSchema.safeParse({
      file: file("samples.xlsx"),
      "stagedUploadIds[]": [firstId, secondId],
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    { rule: "a staged upload id given twice", ids: [firstId, firstId] },
    { rule: "a staged upload id that is not a uuid", ids: ["report.pdf"] },
  ])("should reject $rule", ({ ids }) => {
    // Arrange / Act
    const result = importSamplesSchema.safeParse({
      file: file("samples.xlsx"),
      "stagedUploadIds[]": ids,
    });
    // Assert
    expect(result.success).toBe(false);
  });
});
