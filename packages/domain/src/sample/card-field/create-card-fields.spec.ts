import { describe, expect, it } from "vitest";

import type { Age } from "../age/model.ts";
import type { Messages } from "../create-sample-labels.ts";

import catalog from "../../../messages/en.json";
import { type CardSample, createCardFields } from "./create-card-fields.ts";

const m = Object.fromEntries(
  Object.entries(catalog as Record<string, string>)
    .filter(([key]) => !key.startsWith("$"))
    .map(([key, text]) => [key, () => text]),
) as unknown as Messages;

const {
  typeText,
  materialText,
  formatNumericAge,
  selectedCardFields,
  pickedCardFieldKeys,
} = createCardFields(m, () => "en");

const sample: CardSample = {
  igsn: null,
  internalNumber: null,
  name: "Granite block",
  nature: "hand_sample",
  type: "core.half_round",
  material: "rock_and_sediment.rock",
  specificName: "Pink granite",
  location: null,
  scientificContext: null,
  collectionMethod: null,
  age: null,
};

const age: Age = {
  numericAgeMin: null,
  numericAgeMax: null,
  numericAgeUnit: "ma",
  numericAgeYearsUnit: null,
  geologicalAgeMin: null,
  geologicalAgeMax: null,
  geologicalUnit: null,
};

describe("typeText", () => {
  it("should label every level of the type path, leaving the nature out", () => {
    expect(typeText(sample)).toBe("Core > Core Half round");
  });
});

describe("materialText", () => {
  it("should label every level of the material path, then the specific name", () => {
    expect(materialText(sample)).toBe(
      "Rock and sediment > Rock > Pink granite",
    );
  });
});

describe("formatNumericAge", () => {
  it.each([
    [{ numericAgeMin: 10, numericAgeMax: 20 }, "10-20 Ma"],
    [{ numericAgeMin: 10, numericAgeMax: 10 }, "10 Ma"],
    [{ numericAgeMin: null, numericAgeMax: 20 }, "20 Ma"],
  ])("should format %o as %s", (bounds, text) => {
    expect(formatNumericAge({ ...age, ...bounds })).toBe(text);
  });
});

describe("selectedCardFields", () => {
  it("should keep only the optional fields, in registry order, dropping unknown and locked keys", () => {
    expect(
      selectedCardFields([
        "numericAge",
        "unknown",
        "name",
        "collectionMethod",
      ]).map((field) => field.key),
    ).toEqual(["collectionMethod", "numericAge"]);
  });
});

describe("pickedCardFieldKeys", () => {
  it("should keep the internal id and the optional keys once, in registry order, dropping unknown and locked keys", () => {
    expect(
      pickedCardFieldKeys([
        "numericAge",
        "unknown",
        "igsn",
        "internalNumber",
        "collectionMethod",
        "numericAge",
      ]),
    ).toEqual(["internalNumber", "collectionMethod", "numericAge"]);
  });

  it("should give no key for no keys", () => {
    expect(pickedCardFieldKeys(undefined)).toEqual([]);
  });
});
