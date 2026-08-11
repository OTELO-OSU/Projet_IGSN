import { setInstitutionalGroupsSchema } from "./institutional-groups-validator.ts";

const LORRAINE = "04vfs2w97";
const INSU = "04kdfz702";
const BRGM = "05hnb7x64";

const parse = (groups: object) =>
  setInstitutionalGroupsSchema.safeParse(groups);

describe("setInstitutionalGroupsSchema", () => {
  it.each([
    {
      rule: "a laboratory under the given OSU and organization",
      groups: {
        institutionalOrganization: LORRAINE,
        institutionalOsu: "OTELo",
        institutionalLaboratory: "CRPG",
      },
    },
    {
      rule: "a shared laboratory under its other organization",
      groups: {
        institutionalOrganization: INSU,
        institutionalLaboratory: "CRPG",
      },
    },
  ])("should accept $rule", ({ groups }) => {
    expect(parse(groups).success).toBe(true);
  });

  it.each([
    {
      rule: "a laboratory of other organizations",
      groups: {
        institutionalOrganization: BRGM,
        institutionalLaboratory: "CRPG",
      },
      path: "institutionalLaboratory",
    },
    {
      rule: "a laboratory outside the submitted OSU",
      groups: {
        institutionalOrganization: INSU,
        institutionalOsu: "OSUR",
        institutionalLaboratory: "ISTERRE",
      },
      path: "institutionalLaboratory",
    },
    {
      rule: "an OSU of another organization",
      groups: {
        institutionalOrganization: INSU,
        institutionalOsu: "OTELo",
        institutionalLaboratory: "CRPG",
      },
      path: "institutionalOsu",
    },
  ])("should reject $rule on $path", ({ groups, path }) => {
    const result = parse(groups);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(
      path,
    );
  });
});
