import { MATERIAL_TREE } from "@projet-igsn/domain/sample/material/classification";
import { describe, expect, it } from "vitest";

import { materialPathLabel } from "./material-path-label.ts";

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

  it.each(Object.keys(MATERIAL_TREE))(
    "should resolve a non-empty label for the node %s",
    (segment) => {
      expect(materialPathLabel(segment)).toBeTruthy();
    },
  );
});
