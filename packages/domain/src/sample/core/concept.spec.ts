import { describe, expect, it } from "vitest";

import { toConcept } from "./concept.ts";

describe("toConcept", () => {
  it("should label a dot path with its last segment", () => {
    expect(toConcept("sample-type", "core.section")).toEqual({
      id: "core.section",
      label: "section",
      schemeName: "otelo:sample-type",
      schemeURI: "urn:otelo:vocabulary:sample-type",
      notation: undefined,
    });
  });
});
