import { buildInstitutionTree } from "./build-institution-tree.ts";

const OMP_ORGANIZATION = "03am2jy38";

describe("buildInstitutionTree", () => {
  it("should group an organisme laboratories under their osu or as standalone", () => {
    expect(
      buildInstitutionTree().find(({ ror }) => ror === OMP_ORGANIZATION),
    ).toEqual({
      ror: OMP_ORGANIZATION,
      osus: [
        { code: "OMP", laboratories: ["UMR5110"] },
        { code: null, laboratories: ["USR3278"] },
      ],
    });
  });
});
