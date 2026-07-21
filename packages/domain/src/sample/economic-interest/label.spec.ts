import { describe, expect, it } from "vitest";

import { economicInterestLabelKey } from "./label.ts";

describe("economicInterestLabelKey", () => {
  it.each([
    ["yes", "economic_interest_yes"],
    ["no", "economic_interest_no"],
    ["yes.mineral_and_ore", "economic_interest_mineral_and_ore"],
    ["yes.mineral_and_ore.uranium", "economic_interest_uranium"],
    ["yes.mineral_and_ore.uranium.sandstone", "economic_interest_sandstone"],
    ["yes.hydrocarbon.coal", "economic_interest_coal"],
  ] as const)("should map %s to the message key %s", (path, key) => {
    expect(economicInterestLabelKey(path)).toBe(key);
  });
});
