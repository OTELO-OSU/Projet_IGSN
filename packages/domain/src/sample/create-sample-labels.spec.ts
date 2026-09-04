import { describe, expect, it } from "vitest";

import catalog from "../../messages/en.json";
import { COLLECTION_METHODS } from "./collection-method/vocabulary.ts";
import { createSampleLabels, type Messages } from "./create-sample-labels.ts";
import { GEOMORPHOLOGICAL_ENVIRONMENTS } from "./geomorphological-environment/vocabulary.ts";
import { MATERIAL_PATHS } from "./material/classification.ts";
import { pathSegment } from "./path/segment.ts";
import {
  RESOURCE_TYPE_PATHS,
  RESOURCE_TYPE_TREE,
} from "./resource-type/vocabulary.ts";
import { SAMPLE_TYPES } from "./type/vocabulary.ts";

const m = Object.fromEntries(
  Object.entries(catalog as Record<string, string>)
    .filter(([key]) => !key.startsWith("$"))
    .map(([key, text]) => [key, () => text]),
) as unknown as Messages;

const {
  materialPathLabel,
  typeLabel,
  collectionMethodLabel,
  resourceTypeLabel,
  geomorphologicalEnvironmentLabel,
} = createSampleLabels(m);

describe("materialPathLabel", () => {
  it.each([
    ["rock", "Rock"],
    ["rock.igneous", "Igneous"],
    ["rock.hydrothermal", "Hydrothermal"],
    ["fossil", "Fossil"],
    ["extraterrestrial_rock", "Extraterrestrial rock"],
    ["rock.igneous.plutonic.felsic.granite", "Granite"],
  ] as const)("should label %s as its node name %s", (path, label) => {
    expect(materialPathLabel(path)).toBe(label);
  });

  it.each([
    [
      "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic",
      "Meta-Plutonic",
    ],
    [
      "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite",
      "Meta-Granite",
    ],
    [
      "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock",
      "Meta-igneous rock",
    ],
  ] as const)("should prefix %s with Meta- as %s", (path, label) => {
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
    ["resource type", RESOURCE_TYPE_PATHS, resourceTypeLabel, "resource_type"],
    [
      "geomorphological environment",
      GEOMORPHOLOGICAL_ENVIRONMENTS,
      geomorphologicalEnvironmentLabel,
      "geomorphological_environment",
    ],
  ] as const)(
    "should translate every %s path",
    (_vocabulary, paths, label, prefix) => {
      const untranslated = paths.filter((path) =>
        label(path).includes(`${prefix}_${pathSegment(path)}`),
      );
      expect(untranslated).toEqual([]);
    },
  );

  it("should translate every resource-type childLabel code", () => {
    const childLabels = Object.values(RESOURCE_TYPE_TREE)
      .map((node) => node.childLabel)
      .filter((code): code is string => code !== undefined);
    const untranslated = childLabels.filter(
      (code) => resourceTypeLabel(code) === `resource_type_${code}`,
    );
    expect(untranslated).toEqual([]);
  });
});
