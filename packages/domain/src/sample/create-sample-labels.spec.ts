import { describe, expect, it } from "vitest";

import catalog from "../../messages/en.json";
import { COLLECTION_METHODS } from "./collection-method/vocabulary.ts";
import { createSampleLabels, type Messages } from "./create-sample-labels.ts";
import { GEOMORPHOLOGICAL_ENVIRONMENTS } from "./geomorphological-environment/vocabulary.ts";
import { MATERIAL_PATHS } from "./material/classification.ts";
import { pathSegment } from "./path/segment.ts";
import { RESOURCE_TYPE_PATHS } from "./resource-type/vocabulary.ts";
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
    ["rock_and_sediment", "Rock and sediment"],
    ["rock_and_sediment.rock.igneous.plutonic.felsic.granite", "Granite"],
  ] as const)("should label %s as its node name %s", (path, label) => {
    expect(materialPathLabel(path)).toBe(label);
  });

  it.each([
    [
      "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic",
      "Meta-Plutonic",
    ],
    [
      "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_igneous_rock",
      "Meta-igneous rock",
    ],
  ] as const)("should prefix %s with Meta- as %s", (path, label) => {
    expect(materialPathLabel(path)).toBe(label);
  });
});

describe("typeLabel", () => {
  it("should translate the last segment under the type prefix", () => {
    expect(typeLabel("core.half_round")).toBe("Core Half round");
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
});
