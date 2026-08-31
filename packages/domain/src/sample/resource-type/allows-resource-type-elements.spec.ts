import { describe, expect, it } from "vitest";

import { allowsResourceTypeElements } from "./allows-resource-type-elements.ts";

describe("allowsResourceTypeElements", () => {
  it.each(["mineral_and_ore", "mineral_and_ore.uranium.sandstone"])(
    "should allow the elements on %s",
    (resourceType) => {
      expect(allowsResourceTypeElements(resourceType)).toBe(true);
    },
  );

  it.each(["hydrocarbon.coal", "non_metallic", "alternative", null])(
    "should not allow the elements on %s",
    (resourceType) => {
      expect(allowsResourceTypeElements(resourceType)).toBe(false);
    },
  );
});
