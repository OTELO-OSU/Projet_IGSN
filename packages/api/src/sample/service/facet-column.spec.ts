import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { describe, expect, it } from "vitest";

import { FACET_COLUMN } from "./facet-filter.ts";

const COLUMN_LESS_KINDS = ["numericRange", "manualGroup"];

describe("FACET_COLUMN", () => {
  it("should map every column-backed facet to a column", () => {
    const expected = SAMPLE_FACETS.filter(
      (facet) => !COLUMN_LESS_KINDS.includes(facet.kind),
    ).map((facet) => facet.key);

    expect(Object.keys(FACET_COLUMN).sort()).toEqual(expected.sort());
  });
});
