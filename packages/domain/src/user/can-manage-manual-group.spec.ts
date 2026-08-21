import { describe, expect, it } from "vitest";

import { canManageManualGroup } from "./can-manage-manual-group.ts";

const GROUP = "01890a5d-ac96-774b-bcce-b302099a8001";

describe("canManageManualGroup", () => {
  it.each([
    [
      "any group to a super admin",
      { superAdmin: true, managedManualGroupIds: [] },
      true,
    ],
    [
      "a managed group",
      { superAdmin: false, managedManualGroupIds: [GROUP] },
      true,
    ],
    [
      "a group it does not manage",
      { superAdmin: false, managedManualGroupIds: [] },
      false,
    ],
  ])("should grant %s", (_case, caller, expected) => {
    expect(canManageManualGroup(caller, GROUP)).toBe(expected);
  });
});
