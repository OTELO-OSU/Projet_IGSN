import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { describe, expect, it } from "vitest";

import {
  FACET_COLUMN,
  FACET_JOIN,
  PERSON_FACET_COLUMNS,
} from "./facet-filter.ts";

const OWN_BUILDER_KINDS = ["numericRange", "boolean"];

describe("facet allow-lists", () => {
  it("should resolve every filtering facet through exactly one allow-list", () => {
    const expected = SAMPLE_FACETS.filter(
      (facet) => !OWN_BUILDER_KINDS.includes(facet.kind),
    ).map((facet) => facet.key);

    const mapped = [FACET_COLUMN, PERSON_FACET_COLUMNS, FACET_JOIN].flatMap(
      (map) => Object.keys(map),
    );

    expect(mapped.sort()).toEqual(expected.sort());
  });

  it("should map every linked facet to a join", () => {
    const expected = SAMPLE_FACETS.filter(
      (facet) => facet.kind === "linked",
    ).map((facet) => facet.key);

    expect(Object.keys(FACET_JOIN)).toEqual(expect.arrayContaining(expected));
  });
});
