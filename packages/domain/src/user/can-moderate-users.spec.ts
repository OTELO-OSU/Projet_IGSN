import { describe, expect, it } from "vitest";

import { canModerateUsers } from "./can-moderate-users.ts";

const LABORATORY = "LAB-0001";

describe("canModerateUsers", () => {
  it.each([
    ["a super admin", { superAdmin: true, managedLaboratories: [] }],
    [
      "a laboratory manager",
      { superAdmin: false, managedLaboratories: [LABORATORY] },
    ],
  ])("should let %s moderate users", (_case, me) => {
    expect(canModerateUsers(me)).toBe(true);
  });

  it("should refuse a manager of manual groups only", () => {
    expect(
      canModerateUsers({ superAdmin: false, managedLaboratories: [] }),
    ).toBe(false);
  });
});
