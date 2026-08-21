import { describe, expect, it } from "vitest";

import { NO_MANAGED_GROUPS } from "./managed-groups.ts";
import { managedLaboratoryCodes } from "./managed-laboratory-codes.ts";

const BRGM = "05hnb7x64";
const PARIS_EST_CRETEIL = "05ggc9x40";
const VERSAILLES = "03mkjjy25";
const CO_TUTELLE_LABORATORY = "FR636";

describe("managedLaboratoryCodes", () => {
  it.each([
    {
      scope: "an organization, its own laboratories and those of its OSUs",
      groups: { organizations: [BRGM] },
      expected: ["UAR3116", "UMR7327", "UMR7328", "UPR4301"],
    },
    {
      scope: "an OSU",
      groups: { osus: ["OSUNA"] },
      expected: ["UAR3281", "UMR6112"],
    },
    {
      scope: "a laboratory",
      groups: { laboratories: ["UMR7154"] },
      expected: ["UMR7154"],
    },
    {
      scope: "an organization and one of its laboratories",
      groups: { organizations: [BRGM], laboratories: ["UMR7327"] },
      expected: ["UAR3116", "UMR7327", "UMR7328", "UPR4301"],
    },
  ])(
    "should expand $scope to the laboratories it covers",
    ({ groups, expected }) => {
      expect(
        managedLaboratoryCodes({ ...NO_MANAGED_GROUPS, ...groups }),
      ).toEqual(expected);
    },
  );

  it("should cover a co-tutelle laboratory from either of its organizations", () => {
    const covering = [PARIS_EST_CRETEIL, VERSAILLES].filter((organization) =>
      managedLaboratoryCodes({
        ...NO_MANAGED_GROUPS,
        organizations: [organization],
      }).includes(CO_TUTELLE_LABORATORY),
    );

    expect(covering).toEqual([PARIS_EST_CRETEIL, VERSAILLES]);
  });
});
