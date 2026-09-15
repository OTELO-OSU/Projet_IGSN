import { describe, expect, it } from "vitest";

import { VERTICAL_REFERENCE_SYSTEMS } from "../location/vertical-reference-system.ts";
import { fromVerticalDatum, toVerticalDatum } from "./vertical-datum.ts";

describe("vertical datum", () => {
  it.each(VERTICAL_REFERENCE_SYSTEMS)(
    "should restore %s from its vertical datum",
    (system) => {
      expect(fromVerticalDatum(toVerticalDatum(system))).toBe(system);
    },
  );

  it("should keep the code itself for a system with no EPSG entry", () => {
    expect(toVerticalDatum("local")).toBe("local");
  });
});
