import { describe, expect, it } from "vitest";

import { plainHeader } from "./columns.ts";
import { REQUIRED_SAMPLE_COLUMNS } from "./required-columns.ts";

describe("REQUIRED_SAMPLE_COLUMNS", () => {
  it("should require what every published sample fills, hierarchies down to their publish frontier, conditional fields left out", () => {
    expect(REQUIRED_SAMPLE_COLUMNS.map(plainHeader)).toEqual([
      "Name",
      "Sample type (level 1)",
      "Sample type (level 2)",
      "Nature",
      "Provenance status",
      "Collection date precision",
      "Collection date start",
      "Collection date end",
      "Material (level 1)",
      "Material (level 2)",
      "Material (level 3)",
      "Existence status",
      "Availability status",
    ]);
  });
});
