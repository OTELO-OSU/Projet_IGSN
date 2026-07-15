import { describe, expect, it } from "vitest";

import { sampleDraftFieldErrors } from "./sample-draft-field-errors.ts";

describe("sampleDraftFieldErrors", () => {
  it("should pin issues on the draft fields that produced them", () => {
    expect(
      sampleDraftFieldErrors(
        [
          { path: ["name"] },
          { path: ["type"] },
          { path: ["collectionMethod"] },
          { path: ["location", "position", "longitude"] },
          { path: ["location", "position", "elevation", "min"] },
          { path: ["location", "position", "elevation", "datum"] },
          { path: ["location", "region", "kind"] },
        ],
        "area",
      ),
    ).toEqual({
      name: { message: "Invalid value." },
      typePath: { message: "Invalid value." },
      collectionMethodPath: { message: "Invalid value." },
      "location.longitude": { message: "Invalid value." },
      "location.elevationMin": { message: "Invalid value." },
      "location.elevationDatum": { message: "Invalid value." },
      "location.regionKind": { message: "Invalid value." },
    });
  });

  it("should map an elevation bound to the single value input for a point", () => {
    expect(
      sampleDraftFieldErrors(
        [{ path: ["location", "position", "elevation", "min"] }],
        "point",
      ),
    ).toEqual({ "location.elevationValue": { message: "Invalid value." } });
  });
});
