import { describe, expect, it } from "vitest";

import { isSpaceManager } from "./is-space-manager.ts";
import { NO_MANAGED_GROUPS } from "./managed-groups.ts";

describe("isSpaceManager", () => {
  it.each([
    ["an institutional group", { laboratories: ["UMR7327"] }],
    [
      "a manual group",
      { manualGroupIds: ["3f2504e0-4f89-41d3-9a0c-0305000000a1"] },
    ],
  ])("should make a space manager of a user moderating %s", (_case, groups) => {
    expect(isSpaceManager({ ...NO_MANAGED_GROUPS, ...groups })).toBe(true);
  });

  it("should not make a space manager of a user moderating nothing", () => {
    expect(isSpaceManager(NO_MANAGED_GROUPS)).toBe(false);
  });
});
