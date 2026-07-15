import { describe, expect, it } from "vitest";

import catalog from "../../messages/en.json";
import { collectionMethodLabelKey } from "./collection-method/label.ts";
import { COLLECTION_METHODS } from "./collection-method/vocabulary.ts";
import { createSampleLabels, type Messages } from "./create-sample-labels.ts";
import { MATERIAL_PATHS } from "./material/classification.ts";
import { materialLabelKey } from "./material/label.ts";
import { sampleTypeLabelKey } from "./type/label.ts";
import { SAMPLE_TYPES } from "./type/vocabulary.ts";

// Build the app's paraglide `m` from the shared catalog: paraglide compiles
// each key to a function returning its text, which is exactly this shape. Testing
// the catalog directly (its own source of truth) covers every app's runtime,
// since each app's `m` is generated from this same file.
const m = Object.fromEntries(
  Object.entries(catalog as Record<string, string>)
    .filter(([key]) => !key.startsWith("$"))
    .map(([key, text]) => [key, () => text]),
) as unknown as Messages;

const { materialPathLabel, typeLabel, collectionMethodLabel } =
  createSampleLabels(m);

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
// create-sample-labels.ts). Walk every path and fail on any label that fell back
// to its raw message key.
describe("tree vocabulary label coverage", () => {
  it.each([
    ["material", MATERIAL_PATHS, materialPathLabel, materialLabelKey],
    ["type", SAMPLE_TYPES, typeLabel, sampleTypeLabelKey],
    [
      "collection method",
      COLLECTION_METHODS,
      collectionMethodLabel,
      collectionMethodLabelKey,
    ],
  ] as const)(
    "should translate every %s path",
    (_vocabulary, paths, label, labelKey) => {
      const untranslated = paths.filter(
        (path) => label(path) === labelKey(path),
      );
      expect(untranslated).toEqual([]);
    },
  );
});
