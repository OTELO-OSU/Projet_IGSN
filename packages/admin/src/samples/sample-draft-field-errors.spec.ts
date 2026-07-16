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
      ),
    ).toEqual({
      "description.collectionDateStart": { message: "Invalid value." },
      "description.collectionDateEnd": { message: "Invalid value." },
      "description.lengthValue": {
        message: "Enter a value for the selected unit.",
      },
      "description.massUnit": {
        message: "Select a unit for the entered value.",
      },
      "description.orientationExplanation": { message: "Invalid value." },
    });
  });

  it("should translate a non positive measurement value", () => {
    expect(
      sampleDraftFieldErrors(
        [{ path: ["description", "mass", "value"], code: "too_small" }],
        undefined,
      ),
    ).toEqual({
      "description.massValue": {
        message: "Enter a number greater than zero.",
      },
    });
  });

  it("should translate a future collection date", () => {
    expect(
      sampleDraftFieldErrors(
        [
          {
            path: ["description", "collectionDate", "end"],
            code: "custom",
            params: { code: "collection_date_future" },
          },
        ],
        undefined,
      ),
    ).toEqual({
      "description.collectionDateEnd": {
        message: "The collection date cannot be in the future.",
      },
    });
  });

  it("should read the range order error on both date fields", () => {
    expect(
      sampleDraftFieldErrors(
        [
          {
            path: ["description", "collectionDate", "start"],
            code: "custom",
            params: { code: "collection_date_order" },
          },
        ],
        undefined,
      ),
    ).toEqual({
      "description.collectionDateStart": {
        message: "The start date must be before the end date.",
      },
      "description.collectionDateEnd": {
        message: "The start date must be before the end date.",
      },
    });
  });
});
