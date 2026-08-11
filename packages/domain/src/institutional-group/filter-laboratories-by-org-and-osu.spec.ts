import { filterLaboratoriesByOrgAndOsu } from "./filter-laboratories-by-org-and-osu.ts";

const INSU = "04kdfz702";
const EVERY_INSU_LAB = ["CRPG", "ISTERRE", "GEOSCIENCES-RENNES"];

describe("filterLaboratoriesByOrgAndOsu", () => {
  // a user who declares no OSU must still reach their own laboratory in the
  // mandatory first-login gate
  it.each([
    { osu: undefined, expected: EVERY_INSU_LAB },
    { osu: null, expected: EVERY_INSU_LAB },
    { osu: "OSUG", expected: ["ISTERRE"] },
  ])(
    "should list the organization's laboratories narrowed by the OSU $osu",
    ({ osu, expected }) => {
      expect(
        filterLaboratoriesByOrgAndOsu({ organizationRor: INSU, osu }).map(
          (laboratory) => laboratory.code,
        ),
      ).toEqual(expected);
    },
  );
});
