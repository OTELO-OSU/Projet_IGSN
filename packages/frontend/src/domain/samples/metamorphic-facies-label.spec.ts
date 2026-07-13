import { METAMORPHIC_FACIES } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";
import { describe, expect, it } from "vitest";

import { metamorphicFaciesLabel } from "./metamorphic-facies-label.ts";

describe("metamorphicFaciesLabel", () => {
  it.each([
    ["zeolite", "Zeolite facies"],
    ["hornfels_contact", "Hornfels (contact) facies"],
    ["impactite", "Impactite"],
  ] as const)("should label %s as %s", (code, label) => {
    expect(metamorphicFaciesLabel(code)).toBe(label);
  });

  it.each(METAMORPHIC_FACIES)(
    "should resolve a non-empty label for %s",
    (code) => {
      expect(metamorphicFaciesLabel(code)).toBeTruthy();
    },
  );
});
