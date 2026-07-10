import {
  PLUTONIC_TEXTURES,
  VOLCANIC_TEXTURES,
} from "@projet-igsn/domain/sample/texture/vocabulary";
import { describe, expect, it } from "vitest";

import { textureLabel } from "./texture-label.ts";

describe("textureLabel", () => {
  it.each([
    ["phaneritic", "Phaneritic"],
    ["porphyritic", "Porphyritic"],
    ["glassy", "Glassy"],
  ] as const)("should label %s as %s", (code, label) => {
    expect(textureLabel(code)).toBe(label);
  });

  it.each([...new Set([...PLUTONIC_TEXTURES, ...VOLCANIC_TEXTURES])])(
    "should resolve a non-empty label for %s",
    (code) => {
      expect(textureLabel(code)).toBeTruthy();
    },
  );
});
