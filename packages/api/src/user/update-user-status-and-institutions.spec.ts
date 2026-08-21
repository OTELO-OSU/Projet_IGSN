import type { UpdateUser } from "@projet-igsn/domain/user/user-validator";

import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import { userManagementRights } from "@projet-igsn/domain/user/user-management-rights";
import { describe, expect, it } from "vitest";

import { updateUserStatusAndInstitutions } from "./update-user-status-and-institutions.ts";

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
  manualGroupIds: [],
  managedGroups: { ...NO_MANAGED_GROUPS, osus: ["OTELo"] },
};

const applied = {
  status: "accepted",
  institutionalOrganization: "02rx3b187",
  institutionalOsu: "OSUG",
  institutionalLaboratory: "UMR5275",
};

const rightsOf = (caller: {
  superAdmin: boolean;
  managedLaboratories: string[];
}) => userManagementRights(caller, stored);

describe("updateUserStatusAndInstitutions", () => {
  it.each([
    ["a super admin", { superAdmin: true, managedLaboratories: [] }],
    [
      "a managed laboratory's manager",
      { superAdmin: false, managedLaboratories: ["UMR7358"] },
    ],
  ])(
    "should apply the submitted status and institutions for %s",
    (_, caller) => {
      expect(
        updateUserStatusAndInstitutions(submitted, stored, rightsOf(caller)),
      ).toEqual(applied);
    },
  );

  it("should keep the stored status and institutions out of the institutional scope", () => {
    expect(
      updateUserStatusAndInstitutions(
        submitted,
        stored,
        rightsOf({ superAdmin: false, managedLaboratories: ["UMR7360"] }),
      ),
    ).toEqual(stored);
  });
});
