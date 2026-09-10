import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Other rock sample",
  nature: "hand_sample" as const,
  type: null,
  material: "rock.other",
  collectionMethod: null,
};

describe("sample other material name persistence", () => {
  pgTest(
    "should round-trip the free-text name of an other material",
    async ({ db }) => {
      const created = await insertSample(db, {
        ...base,
        materialOtherName: "Ophicalcite",
      });
      expect(created).toMatchObject({
        material: "rock.other",
        materialOtherName: "Ophicalcite",
      });
      expect(await readSample(db, created.id)).toEqual(created);

      const updated = await updateSample(db, created.id, {
        ...base,
        materialOtherName: "Serpentinite",
      });
      expect(updated).toMatchObject({ materialOtherName: "Serpentinite" });
      expect(await readSample(db, created.id)).toEqual(updated);
    },
  );
});
