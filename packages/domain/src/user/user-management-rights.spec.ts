import { describe, expect, it } from "vitest";

import { userManagementRights } from "./user-management-rights.ts";

const CALLER = { superAdmin: false, managedLaboratories: [] as string[] };
const TARGET = { institutionalLaboratory: "UMR7358" };

describe("userManagementRights", () => {
  it("should grant every field to a super admin", () => {
    expect(
      userManagementRights({ ...CALLER, superAdmin: true }, TARGET),
    ).toEqual({
      status: true,
      institutions: true,
      manualGroups: true,
      managedGroups: true,
    });
  });

  it("should grant the status and the institutions of a user in a managed laboratory", () => {
    expect(
      userManagementRights(
        { ...CALLER, managedLaboratories: ["UMR7358"] },
        TARGET,
      ),
    ).toEqual({
      status: true,
      institutions: true,
      manualGroups: false,
      managedGroups: false,
    });
  });

  it.each([
    [
      "a user with no recorded laboratory",
      { ...CALLER, managedLaboratories: ["UMR7358"] },
      { institutionalLaboratory: null },
    ],
    ["a caller managing nothing", CALLER, TARGET],
  ])("should grant nothing on %s", (_case, caller, target) => {
    expect(userManagementRights(caller, target)).toEqual({
      status: false,
      institutions: false,
      manualGroups: false,
      managedGroups: false,
    });
  });
});
