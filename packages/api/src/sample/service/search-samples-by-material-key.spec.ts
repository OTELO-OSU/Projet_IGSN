import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { searchSamplesByMaterialKey } from "./search-samples-by-material-key.ts";

describe("searchSamplesByMaterialKey", () => {
  pgTest("should find a key at any depth in the path", async ({ db }) => {
    await insertSample(db, {
      name: "Basalt",
      nature: "hand_sample",
      type: null,
      material: "rock.igneous",
    });
    await insertSample(db, {
      name: "Schist",
      nature: "hand_sample",
      type: null,
      material: "rock.metamorphic",
    });

    const igneous = await searchSamplesByMaterialKey(db, "igneous");
    expect(igneous.map((s) => s.name)).toEqual(["Basalt"]);

    const metamorphic = await searchSamplesByMaterialKey(db, "metamorphic");
    expect(metamorphic.map((s) => s.name)).toEqual(["Schist"]);
  });

  pgTest(
    "should return an empty array when nothing matches",
    async ({ db }) => {
      await insertSample(db, {
        name: "Basalt",
        nature: "hand_sample",
        type: null,
        material: "rock.igneous",
      });
      expect(await searchSamplesByMaterialKey(db, "hydrothermal")).toEqual([]);
    },
  );
});
