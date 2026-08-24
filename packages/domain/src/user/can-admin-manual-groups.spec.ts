import { describe, expect, it } from "vitest";

import { canAdminManualGroups } from "./can-admin-manual-groups.ts";

const GROUP = { id: "01890a5d-ac96-774b-bcce-b302099a8001", name: "Volcano" };

describe("canAdminManualGroups", () => {
  it.each([
    [
      "a super admin",
      { superAdmin: true, managedLaboratories: [], managedManualGroups: [] },
    ],
    [
      "an institution manager",
      {
        superAdmin: false,
        managedLaboratories: ["LAB1"],
        managedManualGroups: [],
      },
    ],
    [
      "a manual group manager",
      {
        superAdmin: false,
        managedLaboratories: [],
        managedManualGroups: [GROUP],
      },
    ],
  ])("should allow %s", (_case, me) => {
    expect(canAdminManualGroups(me)).toBe(true);
  });

  it("should refuse a user managing nothing", () => {
    expect(
      canAdminManualGroups({
        superAdmin: false,
        managedLaboratories: [],
        managedManualGroups: [],
      }),
    ).toBe(false);
  });
});
