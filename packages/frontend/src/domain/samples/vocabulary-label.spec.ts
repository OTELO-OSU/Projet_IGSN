import { collectionMethodLabelKey } from "@projet-igsn/domain/sample/collection-method/label";
import { COLLECTION_METHODS } from "@projet-igsn/domain/sample/collection-method/vocabulary";
import { MATERIAL_PATHS } from "@projet-igsn/domain/sample/material/classification";
import { materialLabelKey } from "@projet-igsn/domain/sample/material/label";
import { sampleTypeLabelKey } from "@projet-igsn/domain/sample/type/label";
import { SAMPLE_TYPES } from "@projet-igsn/domain/sample/type/vocabulary";
import { describe, expect, it } from "vitest";

import {
  collectionMethodLabel,
  materialPathLabel,
  typeLabel,
} from "./vocabulary-label.ts";

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

// The dynamic message lookup is not compile-enforced, so walk every vocabulary
// path (covering segments with no tree entry, which default to leaves) and fail
// on any label that fell back to its raw message key.
describe("vocabulary label coverage", () => {
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
