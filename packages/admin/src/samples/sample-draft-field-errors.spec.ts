import { describe, expect, it } from "vitest";

import { sampleDraftFieldErrors } from "./sample-draft-field-errors.ts";

describe("sampleDraftFieldErrors", () => {
  it.each([
    ["invalid_type", "relationType"],
    ["too_small", "identifier"],
  ])(
    "should pin a missing relation value (%s) on the row's indexed field",
    (code, field) => {
      expect(
        sampleDraftFieldErrors([{ path: ["relations", 1, field], code }]),
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
      sampleDraftFieldErrors([
        { path: ["relations", 0, "identifier"], params: { code } },
      ]),
    ).toEqual({ "relations[0].identifier": { message } });
  });

  it("should pin issues on the draft fields that produced them", () => {
    expect(
      sampleDraftFieldErrors([
        { path: ["name"] },
        { path: ["type"] },
        { path: ["collectionMethod"] },
        { path: ["location", "position", "longitude"] },
        { path: ["location", "verticalPositions", 1, "start"] },
        { path: ["location", "verticalPositions", 0, "system"] },
        { path: ["location", "region", "kind"] },
      ]),
    ).toEqual({
      name: { message: "Name is required" },
      typePath: { message: "Invalid value." },
      collectionMethodPath: { message: "Invalid value." },
      "location.longitude": { message: "Invalid value." },
      "location.verticalPositions[1].start": { message: "Invalid value." },
      "location.verticalPositions[0].system": { message: "Invalid value." },
      "location.regionPath": { message: "Invalid value." },
    });
  });

  it("should pin a hierarchy issue on the path field", () => {
    expect(
      sampleDraftFieldErrors([
        { path: ["material"], params: { code: "material_incomplete" } },
      ]),
    ).toEqual({
      materialPath: {
        message:
          "Classify the material at least one level below its root before publishing.",
      },
    });
  });

  it.each(["start", "end"])(
    "should translate a negative vertical %s on its entry's field",
    (bound) => {
      expect(
        sampleDraftFieldErrors([
          {
            path: ["location", "verticalPositions", 1, bound],
            code: "too_small",
          },
        ]),
      ).toEqual({
        [`location.verticalPositions[1].${bound}`]: {
          message: "A vertical position must not be negative.",
        },
      });
    },
  );

  it("should map description issues on the draft fields that produced them", () => {
    expect(
      sampleDraftFieldErrors([
        { path: ["description", "collectionDate", "start"] },
        { path: ["description", "collectionDate", "end"] },
        { path: ["description", "collectionDate", "timeZone"] },
        { path: ["description", "length", "value"] },
        { path: ["description", "mass", "unit"] },
        { path: ["description", "orientationExplanation"] },
      ]),
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
      sampleDraftFieldErrors([
        { path: ["description", "mass", "value"], code: "too_small" },
      ]),
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
        sampleDraftFieldErrors([
          {
            path: ["location", "position", longitudeField],
            code: "too_big",
          },
          {
            path: ["location", "position", latitudeField],
            code: "too_small",
          },
        ]),
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

  it.each([
    ["latitude", "Latitude is required."],
    ["longitude", "Longitude is required."],
  ])("should name the missing %s of a point", (axis, message) => {
    expect(
      sampleDraftFieldErrors([
        { path: ["location", "position", axis], code: "invalid_type" },
      ]),
    ).toEqual({ [`location.${axis}`]: { message } });
  });

  it("should ask for a valid archive contact email", () => {
    expect(
      sampleDraftFieldErrors([
        {
          path: ["repository", "currentArchiveContactEmail"],
          code: "invalid_format",
        },
      ]),
    ).toEqual({
      "repository.currentArchiveContactEmail": {
        message: "Enter a valid email address.",
      },
    });
  });

  it("should not claim a positive bound on a reading value that has none", () => {
    expect(
      sampleDraftFieldErrors([
        {
          path: ["condition", "temperature", "measurement", "value"],
          code: "invalid_type",
        },
      ]),
    ).toEqual({
      "condition.temperatureValue": {
        message: "Enter a value for the selected unit.",
      },
    });
  });

  it("should translate a future collection date", () => {
    expect(
      sampleDraftFieldErrors([
        {
          path: ["description", "collectionDate", "end"],
          params: { code: "collection_date_future" },
        },
      ]),
    ).toEqual({
      "description.collectionDateEnd": {
        message: "The collection date cannot be in the future.",
      },
    });
  });

  it.each([
    {
      path: ["age", "numericAgeMax"],
      code: "numeric_range_order",
      fields: { "age.numericAgeMax": "Max must not be less than min." },
    },
    {
      path: ["location", "verticalPositions", 0, "start"],
      code: "vertical_position_order",
      fields: {
        "location.verticalPositions[0].start":
          "Start must not be greater than end.",
      },
    },
    {
      path: ["location", "position", "northLatitude"],
      code: "area_latitude_order",
      fields: {
        "location.northLatitude": "North must not be less than south.",
      },
    },
    {
      path: ["description", "collectionDate", "start"],
      code: "collection_date_order",
      fields: {
        "description.collectionDateStart":
          "Start date must not be after end date.",
        "description.collectionDateEnd":
          "Start date must not be after end date.",
      },
    },
  ])(
    "should say what is wrong with a $code range",
    ({ path, code, fields }) => {
      expect(sampleDraftFieldErrors([{ path, params: { code } }])).toEqual(
        Object.fromEntries(
          Object.entries(fields).map(([field, message]) => [
            field,
            { message },
          ]),
        ),
      );
    },
  );
});
