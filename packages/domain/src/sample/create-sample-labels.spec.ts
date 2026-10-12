import { describe, expect, it } from "vitest";

import catalog from "../../messages/en.json";
import { COLLECTION_METHODS } from "./collection-method/vocabulary.ts";
import { createSampleLabels, type Messages } from "./create-sample-labels.ts";
import { MATERIAL_PATHS } from "./material/classification.ts";
import { STRUNZ_PATHS } from "./mineral/mineral-hierarchy.ts";
import { pathSegment } from "./path/segment.ts";
import { PHYSIOGRAPHIC_ENVIRONMENTS } from "./physiographic-environment/vocabulary.ts";
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
  physiographicEnvironmentLabel,
  mineralClassificationLabel,
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

describe("mineralClassificationLabel", () => {
  it.each([
    ["9", "Silicates"],
    ["2.B-E", "Metal Sulfides"],
    ["9.E.mindat_2815", "Muscovite"],
  ])("should label %s as %s", (path, label) => {
    expect(mineralClassificationLabel(path)).toBe(label);
  });
});

describe("tree vocabulary label coverage", () => {
  it("should translate every Strunz path", () => {
    expect(
      STRUNZ_PATHS.filter((path) =>
        mineralClassificationLabel(path).includes("strunz_"),
      ),
    ).toEqual([]);
  });

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
      "physiographic environment",
      PHYSIOGRAPHIC_ENVIRONMENTS,
      physiographicEnvironmentLabel,
      "physiographic_environment",
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
