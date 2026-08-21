import type { UpdateUser } from "@projet-igsn/domain/user/user-validator";

import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import { userManagementRights } from "@projet-igsn/domain/user/user-management-rights";
import { describe, expect, it } from "vitest";

import { updateUserStatusAndInstitutions } from "./update-user-status-and-institutions.ts";

const ALPES = "01890a5d-ac96-774b-bcce-b302099a9002";

const stored = {
  status: "pending" as const,
  institutionalOrganization: "04vfs2w97",
  institutionalOsu: "OTELo",
  institutionalLaboratory: "UMR7358",
};

const submitted: UpdateUser = {
  status: "accepted",
  institutionalOrganization: "02rx3b187",
  institutionalOsu: "OSUG",
  institutionalLaboratory: "UMR5275",
  manualGroupIds: [ALPES],
  managedGroups: { ...NO_MANAGED_GROUPS, osus: ["OTELo"] },
};

const applied = {
  status: "accepted",
  institutionalOrganization: "02rx3b187",
  institutionalOsu: "OSUG",
  institutionalLaboratory: "UMR5275",
};

const CALLER = {
  superAdmin: false,
  managedLaboratories: [] as string[],
  managedManualGroupIds: [] as string[],
};

const rightsOf = (caller: typeof CALLER) =>
  userManagementRights(caller, stored);

describe("updateUserStatusAndInstitutions", () => {
  it("should apply the submitted status and institutions for a managed laboratory's manager", () => {
    expect(
      updateUserStatusAndInstitutions(
        submitted,
        stored,
        rightsOf({ ...CALLER, managedLaboratories: ["UMR7358"] }),
      ),
    ).toEqual(applied);
  });

  it("should keep the stored status and institutions for another laboratory's manager", () => {
    expect(
      updateUserStatusAndInstitutions(
        submitted,
        stored,
        rightsOf({ ...CALLER, managedLaboratories: ["UMR7360"] }),
      ),
    ).toEqual(stored);
  });
});
