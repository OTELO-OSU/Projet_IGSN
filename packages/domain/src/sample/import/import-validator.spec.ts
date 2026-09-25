import { XLSX_MEDIA_TYPE, importSamplesSchema } from "./import-validator.ts";

function file(name: string) {
  return new File([new Uint8Array(4)], name, { type: XLSX_MEDIA_TYPE });
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
});
