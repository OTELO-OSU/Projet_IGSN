import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { describe, expect, it } from "vitest";

import { FACET_COLUMN } from "./facet-filter.ts";

describe("FACET_COLUMN", () => {
  it("should map every facet but the numeric range to a column", () => {
    const expected = SAMPLE_FACETS.filter(
      (facet) => facet.kind !== "numericRange",
    ).map((facet) => facet.key);

    expect(Object.keys(FACET_COLUMN).sort()).toEqual(expected.sort());
  });
});
