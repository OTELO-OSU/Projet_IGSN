import { describe, expect, it } from "vitest";

import { sampleDraftFieldErrors } from "./sample-draft-field-errors.ts";

const draft = (over?: {
  typePath?: (string | undefined)[];
  materialPath?: (string | undefined)[];
  collectionMethodPath?: (string | undefined)[];
}) => ({
  typePath: over?.typePath ?? [],
  materialPath: over?.materialPath ?? [],
  collectionMethodPath: over?.collectionMethodPath ?? [],
});

describe("sampleDraftFieldErrors", () => {
  it.each([
    ["invalid_type", "relationType"],
    ["invalid_value", "identifierType"],
    ["too_small", "identifier"],
  ])(
    "should pin a missing relation value (%s) on the row's indexed field",
    (code, field) => {
      expect(
        sampleDraftFieldErrors(
          [{ path: ["relations", 1, field], code }],
          draft(),
        ),
      ).toEqual({
        [`relations[1].${field}`]: { message: "Required." },
      });
    },
  );

  it.each([
    [
      "relation_identifier_doi",
      "Enter a DOI (https://doi.org/10.xxxx/... or doi:10.xxxx/...).",
    ],
    ["relation_identifier_igsn", "Enter a valid IGSN."],
    ["relation_identifier_url", "Enter a valid URL."],
    [
      "relation_scheme_without_has_metadata",
      "Only allowed when the relation type is Has metadata.",
    ],
  ])("should translate the %s relation error", (code, message) => {
    expect(
      sampleDraftFieldErrors(
        [{ path: ["relations", 0, "identifier"], params: { code } }],
        draft(),
      ),
    ).toEqual({ "relations[0].identifier": { message } });
  });

  it("should pin issues on the draft fields that produced them", () => {
    expect(
      sampleDraftFieldErrors(
        [
          { path: ["name"] },
          { path: ["type"] },
          { path: ["collectionMethod"] },
          { path: ["location", "position", "longitude"] },
          { path: ["location", "position", "vertical", "min"] },
          { path: ["location", "position", "vertical", "system"] },
          { path: ["location", "region", "kind"] },
        ],
        draft(),
      ),
    ).toEqual({
      name: { message: "Invalid value." },
      "typePath[0]": { message: "Invalid value." },
      "collectionMethodPath[0]": { message: "Invalid value." },
      "location.longitude": { message: "Invalid value." },
      "location.verticalPositionMin": { message: "Invalid value." },
      "location.verticalReferenceSystem": { message: "Invalid value." },
      "location.regionKind": { message: "Invalid value." },
    });
  });

  it.each([
    ["the next level to refine", ["rock", "rock.igneous"]],
    ["a cleared level, not past it", ["rock", "rock.igneous", undefined]],
  ])("should pin a hierarchy issue on %s", (_label, materialPath) => {
    expect(
      sampleDraftFieldErrors(
        [{ path: ["material"], params: { code: "material_incomplete" } }],
        draft({ materialPath }),
      ),
    ).toEqual({
      "materialPath[2]": {
        message:
          "Classify the material down to a specific type before publishing.",
      },
    });
  });

  it("should translate a negative vertical position", () => {
    expect(
      sampleDraftFieldErrors(
        [
          {
            path: ["location", "position", "vertical", "position"],
            code: "too_small",
          },
        ],
        draft(),
      ),
    ).toEqual({
      "location.verticalPosition": {
        message: "A vertical position must not be negative.",
      },
    });
  });

  it("should map description issues on the draft fields that produced them", () => {
    expect(
      sampleDraftFieldErrors(
        [
          { path: ["description", "collectionDate", "start"] },
          { path: ["description", "collectionDate", "end"] },
          { path: ["description", "collectionDate", "timeZone"] },
          { path: ["description", "length", "value"] },
          { path: ["description", "mass", "unit"] },
          { path: ["description", "orientationExplanation"] },
        ],
        draft(),
      ),
    ).toEqual({
      "description.collectionDateStart": { message: "Invalid value." },
      "description.collectionDateEnd": { message: "Invalid value." },
      "description.collectionDateTimeZone": { message: "Invalid value." },
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

  it.each([
    ["a point coordinate", "longitude", "latitude"],
    ["a line endpoint", "startLongitude", "endLatitude"],
    ["an area bound", "westLongitude", "northLatitude"],
  ])(
    "should translate an out-of-range %s on submit",
    (_label, longitudeField, latitudeField) => {
      expect(
        sampleDraftFieldErrors(
          [
            {
              path: ["location", "position", longitudeField],
              code: "too_big",
            },
            {
              path: ["location", "position", latitudeField],
              code: "too_small",
            },
          ],
          draft(),
        ),
      ).toEqual({
        [`location.${longitudeField}`]: {
          message: "Longitude must be between -180 and 180.",
        },
        [`location.${latitudeField}`]: {
          message: "Latitude must be between -90 and 90.",
        },
      });
    },
  );

  it("should keep the generic message on a missing coordinate", () => {
    expect(
      sampleDraftFieldErrors(
        [
          {
            path: ["location", "position", "latitude"],
            code: "invalid_type",
          },
        ],
        draft(),
      ),
    ).toEqual({ "location.latitude": { message: "Invalid value." } });
  });

  it("should not claim a positive bound on a reading value that has none", () => {
    expect(
      sampleDraftFieldErrors(
        [
          {
            path: ["condition", "temperature", "measurement", "value"],
            code: "invalid_type",
          },
        ],
        draft(),
      ),
    ).toEqual({
      "condition.temperatureValue": {
        message: "Enter a value for the selected unit.",
      },
    });
  });

  it("should translate a future collection date", () => {
    expect(
      sampleDraftFieldErrors(
        [
          {
            path: ["description", "collectionDate", "end"],
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
