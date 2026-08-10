import { describe, expect, it } from "vitest";

import catalog from "../../messages/en.json";
import { COLLECTION_METHODS } from "./collection-method/vocabulary.ts";
import { createSampleLabels, type Messages } from "./create-sample-labels.ts";
import {
  ECONOMIC_INTEREST_PATHS,
  ECONOMIC_INTEREST_TREE,
} from "./economic-interest/vocabulary.ts";
import { MATERIAL_PATHS } from "./material/classification.ts";
import { pathSegment } from "./path/segment.ts";
import { SAMPLE_TYPES } from "./type/vocabulary.ts";

// Build the app's paraglide `m` from the shared catalog: paraglide compiles
// each key to a function returning its text, which is exactly this shape.
const m = Object.fromEntries(
  Object.entries(catalog as Record<string, string>)
    .filter(([key]) => !key.startsWith("$"))
    .map(([key, text]) => [key, () => text]),
) as unknown as Messages;

const {
  materialPathLabel,
  typeLabel,
  collectionMethodLabel,
  economicInterestLabel,
} = createSampleLabels(m);

describe("materialPathLabel", () => {
  it.each([
    ["rock", "Rock"],
    ["rock.igneous", "Igneous"],
    ["rock.hydrothermal", "Hydrothermal"],
    ["fossil", "Fossil"],
    ["extraterrestrial_rock", "Extraterrestrial rock"],
  ] as const)("should label %s as its node name %s", (path, label) => {
    expect(materialPathLabel(path)).toBe(label);
  });
});

describe("typeLabel", () => {
  it.each([
    ["core", "Core"],
    ["core.half_round", "Core Half round"],
    ["dredge", "Dredge"],
  ] as const)("should return the translated label for %s", (type, label) => {
    expect(typeLabel(type)).toBe(label);
  });
});

// The tree vocabularies take runtime string paths, so their key coverage is not
// compile-checked (unlike the flat vocabularies, guarded by AssertKeys in
// create-sample-labels.ts).
describe("tree vocabulary label coverage", () => {
  it.each([
    ["material", MATERIAL_PATHS, materialPathLabel, "material"],
    ["type", SAMPLE_TYPES, typeLabel, "type"],
    [
      "collection method",
      COLLECTION_METHODS,
      collectionMethodLabel,
      "collection_method",
    ],
    [
      "economic interest",
      ECONOMIC_INTEREST_PATHS,
      economicInterestLabel,
      "economic_interest",
    ],
  ] as const)(
    "should translate every %s path",
    (_vocabulary, paths, label, prefix) => {
      const untranslated = paths.filter(
        (path) => label(path) === `${prefix}_${pathSegment(path)}`,
      );
      expect(untranslated).toEqual([]);
    },
  );

  // A node's childLabel names the level it opens; it is a code, not a path, so
  // the walk above never covers it.
  it("should translate every economic-interest childLabel code", () => {
    const childLabels = Object.values(ECONOMIC_INTEREST_TREE)
      .map((node) => node.childLabel)
      .filter((code): code is string => code !== undefined);
    const untranslated = childLabels.filter(
      (code) => economicInterestLabel(code) === `economic_interest_${code}`,
    );
    expect(untranslated).toEqual([]);
  });
});
