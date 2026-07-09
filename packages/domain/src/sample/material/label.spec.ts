import { describe, expect, it } from "vitest";

import { materialLabelKey } from "./label.ts";

describe("materialLabelKey", () => {
  it.each([
    ["rock", "material_rock"],
    ["rock.igneous", "material_igneous"],
    ["extraterrestrial_rock", "material_extraterrestrial_rock"],
  ] as const)("should map %s to the message key %s", (path, key) => {
    expect(materialLabelKey(path)).toBe(key);
  });
});
