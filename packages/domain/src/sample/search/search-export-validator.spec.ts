import { MAX_SEARCH_CSV_EXPORT_ROWS } from "./max-search-export-rows.ts";
import { searchSelectionExportSchema } from "./search-export-validator.ts";

const IGSN = "01K072TVWVFK5A1RRZ5MY4PPK9";
const OTHER_IGSN = "CNRS0000000001";

describe("searchSelectionExportSchema", () => {
  it("should accept an xlsx export of valid IGSNs", () => {
    // Arrange / Act
    const result = searchSelectionExportSchema.safeParse({
      format: "xlsx",
      igsns: [IGSN, OTHER_IGSN],
    });
    // Assert
    expect(result.data).toEqual({ format: "xlsx", igsns: [IGSN, OTHER_IGSN] });
  });

  it("should default a missing format to csv", () => {
    // Arrange / Act
    const result = searchSelectionExportSchema.safeParse({ igsns: [IGSN] });
    // Assert
    expect(result.data?.format).toBe("csv");
  });

  it.each([
    ["no IGSN", { format: "csv", igsns: [] }],
    [
      "more IGSNs than the export cap",
      {
        format: "csv",
        igsns: Array.from(
          { length: MAX_SEARCH_CSV_EXPORT_ROWS + 1 },
          () => IGSN,
        ),
      },
    ],
    ["a malformed IGSN", { format: "csv", igsns: ["not-an-igsn"] }],
    ["an unknown format", { format: "pdf", igsns: [IGSN] }],
    ["an unknown field", { format: "csv", igsns: [IGSN], filters: {} }],
  ])("should reject %s", (_, body) => {
    // Arrange / Act
    const result = searchSelectionExportSchema.safeParse(body);
    // Assert
    expect(result.success).toBe(false);
  });
});
