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
        "single",
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
        "single",
      ),
    ).toEqual({ "location.elevationValue": { message: "Invalid value." } });
  });

  it("should map description issues on the draft fields that produced them", () => {
    expect(
      sampleDraftFieldErrors(
        [
          { path: ["description", "collectionDate", "start"] },
          { path: ["description", "collectionDate", "end"] },
          { path: ["description", "length", "value"] },
          { path: ["description", "mass", "unit"] },
          { path: ["description", "orientationExplanation"] },
        ],
        undefined,
        "range",
      ),
    ).toEqual({
      "description.collectionDateStart": { message: "Invalid value." },
      "description.collectionDateEnd": { message: "Invalid value." },
      "description.lengthValue": { message: "Invalid value." },
      "description.massUnit": { message: "Invalid value." },
      "description.orientationExplanation": { message: "Invalid value." },
    });
  });

  it("should map a collection date bound to the single date input in single mode", () => {
    expect(
      sampleDraftFieldErrors(
        [{ path: ["description", "collectionDate", "start"] }],
        undefined,
        "single",
      ),
    ).toEqual({ "description.collectionDate": { message: "Invalid value." } });
  });
});
