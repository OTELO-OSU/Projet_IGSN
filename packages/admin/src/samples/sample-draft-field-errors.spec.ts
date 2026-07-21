import { describe, expect, it } from "vitest";

import { sampleDraftFieldErrors } from "./sample-draft-field-errors.ts";

// The draft context the mapping reads: the location mode and the hierarchy
// paths (a hierarchy issue pins on the next level's combobox).
const draft = (over?: {
  typePath?: string[];
  materialPath?: string[];
  collectionMethodPath?: string[];
  locationType?: "point" | "area" | null | undefined;
}) => ({
  typePath: over?.typePath ?? [],
  materialPath: over?.materialPath ?? [],
  collectionMethodPath: over?.collectionMethodPath ?? [],
  location: { type: over?.locationType },
});

describe("sampleDraftFieldErrors", () => {
  it("should pin a link issue on the row's indexed field", () => {
    expect(
      sampleDraftFieldErrors([{ path: ["links", 1, "url"] }], draft()),
    ).toEqual({
      "links[1].url": {
        message: "Enter a DOI URL (https://doi.org/...).",
      },
    });
  });

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
        draft({ locationType: "area" }),
      ),
    ).toEqual({
      name: { message: "Invalid value." },
      "typePath[0]": { message: "Invalid value." },
      "collectionMethodPath[0]": { message: "Invalid value." },
      "location.longitude": { message: "Invalid value." },
      "location.elevationMin": { message: "Invalid value." },
      "location.elevationDatum": { message: "Invalid value." },
      "location.regionKind": { message: "Invalid value." },
    });
  });

  it("should pin a hierarchy issue on the next level to refine", () => {
    // material "rock.igneous" walks two levels, so the error belongs to the
    // third combobox, the one the user must pick to complete the path.
    expect(
      sampleDraftFieldErrors(
        [
          {
            path: ["material"],
            code: "custom",
            params: { code: "material_incomplete" },
          },
        ],
        draft({ materialPath: ["rock", "rock.igneous"] }),
      ),
    ).toEqual({
      "materialPath[2]": {
        message:
          "Classify the material down to a specific type before publishing.",
      },
    });
  });

  it("should map an elevation bound to the single value input for a point", () => {
    expect(
      sampleDraftFieldErrors(
        [{ path: ["location", "position", "elevation", "min"] }],
        draft({ locationType: "point" }),
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
        draft(),
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
        draft(),
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
        draft(),
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
        draft(),
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
