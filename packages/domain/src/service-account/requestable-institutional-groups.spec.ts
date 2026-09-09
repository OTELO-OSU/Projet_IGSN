import { describe, expect, it } from "vitest";

import { NO_MANAGED_GROUPS } from "../user/managed-groups.ts";
import { requestableInstitutionalGroups } from "./requestable-institutional-groups.ts";

const BRGM = "05hnb7x64";
const OWN_LABORATORY = "UMR7154";

describe("requestableInstitutionalGroups", () => {
  it.each([
    {
      user: "managing nothing",
      managed: NO_MANAGED_GROUPS,
      expected: {
        organizations: [],
        osus: [],
        laboratories: [OWN_LABORATORY],
      },
    },
    {
      user: "managing an organization",
      managed: { ...NO_MANAGED_GROUPS, organizations: [BRGM] },
      expected: {
        organizations: [BRGM],
        osus: ["OSUC"],
        laboratories: [
          "UAR3116",
          OWN_LABORATORY,
          "UMR7327",
          "UMR7328",
          "UPR4301",
        ],
      },
    },
    {
      user: "managing an OSU",
      managed: { ...NO_MANAGED_GROUPS, osus: ["OSUNA"] },
      expected: {
        organizations: [],
        osus: ["OSUNA"],
        laboratories: ["UAR3281", "UMR6112", OWN_LABORATORY],
      },
    },
    {
      user: "managing a laboratory",
      managed: { ...NO_MANAGED_GROUPS, laboratories: ["UMR7327"] },
      expected: {
        organizations: [],
        osus: [],
        laboratories: [OWN_LABORATORY, "UMR7327"],
      },
    },
  ])(
    "should offer a user $user their own laboratory and every group they manage",
    ({ managed, expected }) => {
      expect(requestableInstitutionalGroups(OWN_LABORATORY, managed)).toEqual(
        expected,
      );
    },
  );

  it("should offer nothing to a user with no laboratory managing nothing", () => {
    expect(requestableInstitutionalGroups(null, NO_MANAGED_GROUPS)).toEqual({
      organizations: [],
      osus: [],
      laboratories: [],
    });
  });
});
