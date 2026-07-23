import { describe, expect, it } from "vitest";

import { isPathAtOrUnder } from "./is-at-or-under.ts";

describe("isPathAtOrUnder", () => {
  it.each([
    ["yes", "yes"],
    ["yes.mineral_and_ore", "yes"],
    ["yes.mineral_and_ore.uranium", "yes.mineral_and_ore"],
  ])("should treat %s as at or under %s", (path, ancestor) => {
    expect(isPathAtOrUnder(path, ancestor)).toBe(true);
  });

  it.each([
    ["no", "yes"],
    ["yes.mineral_and_ore_other", "yes.mineral_and_ore"],
    [null, "yes"],
    [undefined, "yes"],
  ])("should treat %s as not under %s", (path, ancestor) => {
    expect(isPathAtOrUnder(path, ancestor)).toBe(false);
  });
});
