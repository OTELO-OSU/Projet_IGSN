import { MAX_IMPORT_ROWS } from "../import/max-import-rows.ts";
import { exportSamplesRequestSchema } from "./export-validator.ts";

const uuids = (count: number) =>
  Array.from({ length: count }, () => crypto.randomUUID());

describe("exportSamplesRequestSchema", () => {
  it.each([1, MAX_IMPORT_ROWS])("should accept %i ids", (count) => {
    // Arrange / Act
    const result = exportSamplesRequestSchema.safeParse({
      mode: "ids",
      moderated: false,
      ids: uuids(count),
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    ["no id", { mode: "ids", moderated: false, ids: [] }],
    [
      "more ids than the cap",
      { mode: "ids", moderated: false, ids: uuids(MAX_IMPORT_ROWS + 1) },
    ],
    ["a non-uuid id", { mode: "ids", moderated: false, ids: ["not-a-uuid"] }],
    ["an unknown mode", { mode: "all", moderated: false }],
    ["no moderated flag", { mode: "filters", query: {} }],
  ])("should refuse %s", (_, body) => {
    // Arrange / Act
    const result = exportSamplesRequestSchema.safeParse(body);
    // Assert
    expect(result.success).toBe(false);
  });
});
