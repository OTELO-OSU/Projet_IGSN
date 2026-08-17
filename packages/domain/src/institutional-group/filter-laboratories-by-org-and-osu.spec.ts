import { filterLaboratoriesByOrgAndOsu } from "./filter-laboratories-by-org-and-osu.ts";

const ORLEANS = "014zrew76";
const EVERY_ORLEANS_LAB = ["UAR704", "UAR3116", "UMR7327", "UMR7328"];

describe("filterLaboratoriesByOrgAndOsu", () => {
  it.each([
    { osu: undefined, expected: EVERY_ORLEANS_LAB },
    { osu: null, expected: EVERY_ORLEANS_LAB },
    { osu: "OBSPM", expected: ["UAR704"] },
  ])(
    "should list the organization's laboratories narrowed by the OSU $osu",
    ({ osu, expected }) => {
      expect(
        filterLaboratoriesByOrgAndOsu({ organizationRor: ORLEANS, osu }).map(
          (laboratory) => laboratory.code,
        ),
      ).toEqual(expected);
    },
  );
});
