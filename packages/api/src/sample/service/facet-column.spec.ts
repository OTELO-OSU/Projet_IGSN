import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { describe, expect, it } from "vitest";

import { FACET_COLUMN } from "./list-sample.ts";

// SAMPLE_FACETS is typed `readonly SampleFacet[]`, so its keys are widened to
// `string` and the column map cannot be a compile-time exhaustive Record. This
// guards the drift instead: a facet added to the registry without a column here
// would silently filter nothing.
describe("FACET_COLUMN", () => {
  it("should map every facet but the numeric range to a column", () => {
    const expected = SAMPLE_FACETS.filter(
      (facet) => facet.kind !== "numericRange",
    ).map((facet) => facet.key);

    expect(Object.keys(FACET_COLUMN).sort()).toEqual(expected.sort());
  });
});
