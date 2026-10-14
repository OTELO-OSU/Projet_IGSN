import { describe, expect, it } from "vitest";

import { canSetSuperAdmin } from "./can-set-super-admin.ts";

const CALLER = "01890a5d-ac96-774b-bcce-b302099a8001";
const TARGET = "01890a5d-ac96-774b-bcce-b302099a8002";

describe("canSetSuperAdmin", () => {
  it("should let a super admin set another user's role", () => {
    expect(
      canSetSuperAdmin({ callerId: CALLER, superAdmin: true }, TARGET),
    ).toBe(true);
  });

  it.each([
    ["a super admin on their own account", true, CALLER],
    ["a caller who is not super admin", false, TARGET],
  ])("should refuse %s", (_case, superAdmin, targetId) => {
    expect(canSetSuperAdmin({ callerId: CALLER, superAdmin }, targetId)).toBe(
      false,
    );
  });
});
