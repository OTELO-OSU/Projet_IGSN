import {
  IMPORT_MAX_BYTES,
  XLSX_MEDIA_TYPE,
  importSamplesSchema,
} from "./import-validator";

function file(name: string, type = XLSX_MEDIA_TYPE, bytes = 4) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("importSamplesSchema", () => {
  it.each(["samples.xlsx", "FOO.XLSX"])(
    "should accept the xlsx workbook %s",
    (name) => {
      // Arrange / Act
      const result = importSamplesSchema.safeParse({ file: file(name) });
      // Assert
      expect(result.success).toBe(true);
    },
  );

  it.each([
    {
      case: "a wrong extension",
      input: { file: file("a.csv") },
      codes: ["custom"],
    },
    {
      case: "a wrong media type",
      input: { file: file("a.xlsx", "text/csv") },
      codes: ["invalid_value"],
    },
    {
      case: "an empty media type",
      input: { file: file("a.xlsx", "") },
      codes: ["invalid_value"],
    },
    {
      case: "an oversize file",
      input: { file: file("a.xlsx", XLSX_MEDIA_TYPE, IMPORT_MAX_BYTES + 1) },
      codes: ["too_big"],
    },
    { case: "a missing file", input: {}, codes: ["invalid_type"] },
  ])(
    "should reject $case with an issue telling size from type",
    ({ input, codes }) => {
      // Arrange / Act
      const result = importSamplesSchema.safeParse(input);
      // Assert
      expect(result.error?.issues.map((issue) => issue.code)).toEqual(codes);
    },
  );
});
