import { describe, expect, it } from "vitest";

import { isSpaceManager } from "./is-space-manager.ts";
import { NO_MANAGED_GROUPS } from "./managed-groups.ts";

describe("isSpaceManager", () => {
  it.each([
    ["an organization", { organizations: ["05hnb7x64"] }],
    ["an OSU", { osus: ["OSUNA"] }],
    ["a laboratory", { laboratories: ["UMR7327"] }],
  ])("should make a space manager of a user moderating %s", (_case, groups) => {
    expect(isSpaceManager({ ...NO_MANAGED_GROUPS, ...groups })).toBe(true);
  });

  it("should not make a space manager of a user moderating nothing", () => {
    expect(isSpaceManager(NO_MANAGED_GROUPS)).toBe(false);
  });
});
