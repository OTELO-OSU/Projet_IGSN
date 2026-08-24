import { describe, expect, it } from "vitest";

import { shouldRePendOnInstitutionsUpdate } from "./should-re-pend-on-institutions-update.ts";

describe("shouldRePendOnInstitutionsUpdate", () => {
  it("should re-pend an account whose moderated institution is cleared", () => {
    expect(
      shouldRePendOnInstitutionsUpdate(
        { institutionalOrganization: "ORG", superAdmin: false },
        null,
      ),
    ).toBe(true);
  });

  it.each([
    [
      "a super admin keeps its status",
      { institutionalOrganization: "ORG", superAdmin: true },
      null,
    ],
    [
      "clearing an account with no institution is idempotent",
      { institutionalOrganization: null, superAdmin: false },
      null,
    ],
    [
      "a first declaration never re-pends",
      { institutionalOrganization: null, superAdmin: false },
      "ORG",
    ],
    [
      "moving the institution is itself the moderation",
      { institutionalOrganization: "ORG", superAdmin: false },
      "OTHER",
    ],
  ])("should not re-pend when %s", (_case, stored, next) => {
    expect(shouldRePendOnInstitutionsUpdate(stored, next)).toBe(false);
  });
});
