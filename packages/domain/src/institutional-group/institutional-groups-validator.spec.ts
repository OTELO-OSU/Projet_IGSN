import { setInstitutionalGroupsSchema } from "./institutional-groups-validator.ts";

const ORLEANS = "014zrew76";
const LORRAINE = "04vfs2w97";
const BRGM = "05hnb7x64";

const parse = (groups: object) =>
  setInstitutionalGroupsSchema.safeParse(groups);

describe("setInstitutionalGroupsSchema", () => {
  it.each([
    {
      rule: "a laboratory under the given OSU and organization",
      groups: {
        institutionalOrganization: ORLEANS,
        institutionalOsu: "OSUC",
        institutionalLaboratory: "UMR7327",
      },
    },
    {
      rule: "a shared laboratory under its other organization",
      groups: {
        institutionalOrganization: BRGM,
        institutionalLaboratory: "UMR7327",
      },
    },
  ])("should accept $rule", ({ groups }) => {
    expect(parse(groups).success).toBe(true);
  });

  it.each([
    {
      rule: "a laboratory of other organizations",
      groups: {
        institutionalOrganization: LORRAINE,
        institutionalLaboratory: "UMR7327",
      },
      path: "institutionalLaboratory",
    },
    {
      rule: "a laboratory outside the submitted OSU",
      groups: {
        institutionalOrganization: ORLEANS,
        institutionalOsu: "OBSPM",
        institutionalLaboratory: "UMR7327",
      },
      path: "institutionalLaboratory",
    },
    {
      rule: "an OSU of another organization",
      groups: {
        institutionalOrganization: ORLEANS,
        institutionalOsu: "OTELo",
        institutionalLaboratory: "UMR7327",
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
