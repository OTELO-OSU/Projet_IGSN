import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { describe, expect, it } from "vitest";

import { FACET_COLUMN, FACET_JOIN } from "./facet-filter.ts";

const COLUMN_LESS_KINDS = ["numericRange", "linked"];

describe("facet allow-lists", () => {
  it("should map every column-backed facet to a column", () => {
    const expected = SAMPLE_FACETS.filter(
      (facet) => !COLUMN_LESS_KINDS.includes(facet.kind),
    ).map((facet) => facet.key);

    expect(Object.keys(FACET_COLUMN).sort()).toEqual(expected.sort());
  });

  it("should map every linked facet to a join", () => {
    const expected = SAMPLE_FACETS.filter(
      (facet) => facet.kind === "linked",
    ).map((facet) => facet.key);

    expect(Object.keys(FACET_JOIN).sort()).toEqual(expected.sort());
  });
});
