import { serviceAccountBodySchema } from "./service-account-validator.ts";

const ORLEANS = "014zrew76";
const LORRAINE = "04vfs2w97";
const BRGM = "05hnb7x64";
const UNKNOWN_ROR = "0zzzzzz99";
const MANUAL_GROUP_ID = "b3a5b7f0-6b3e-4a0e-8f2a-2c3d4e5f6a7b";

const NO_MANAGED_GROUPS = {
  organizations: [],
  osus: [],
  laboratories: [],
  manualGroupIds: [],
};

const body = (overrides: object) => ({
  name: "Gaia Data",
  institutionalOrganization: ORLEANS,
  institutionalOsu: null,
  institutionalLaboratory: "UMR7327",
  managedGroups: NO_MANAGED_GROUPS,
  ...overrides,
});

const parse = (account: object) => serviceAccountBodySchema.safeParse(account);

describe("serviceAccountBodySchema", () => {
  it.each([
    {
      rule: "an organization and its laboratory without managed groups",
      account: body({}),
    },
    {
      rule: "an OSU and managed groups of every kind",
      account: body({
        institutionalOsu: "OSUC",
        managedGroups: {
          organizations: [BRGM],
          osus: ["OSUNA"],
          laboratories: ["UMR7154"],
          manualGroupIds: [MANUAL_GROUP_ID],
        },
      }),
    },
  ])("should accept $rule", ({ account }) => {
    expect(parse(account).success).toBe(true);
  });

  it.each([
    { rule: "a blank name", account: body({ name: "   " }), path: "name" },
    {
      rule: "a name over 100 characters",
      account: body({ name: "a".repeat(101) }),
      path: "name",
    },
    {
      rule: "a missing organization",
      account: body({ institutionalOrganization: undefined }),
      path: "institutionalOrganization",
    },
    {
      rule: "a missing laboratory",
      account: body({ institutionalLaboratory: undefined }),
      path: "institutionalLaboratory",
    },
    {
      rule: "a laboratory outside the submitted organization",
      account: body({ institutionalOrganization: LORRAINE }),
      path: "institutionalLaboratory",
    },
    {
      rule: "a laboratory outside the submitted OSU",
      account: body({ institutionalOsu: "OBSPM" }),
      path: "institutionalLaboratory",
    },
    {
      rule: "an OSU outside the submitted organization",
      account: body({ institutionalOsu: "OTELo" }),
      path: "institutionalOsu",
    },
    {
      rule: "an unknown managed organization code",
      account: body({
        managedGroups: { ...NO_MANAGED_GROUPS, organizations: [UNKNOWN_ROR] },
      }),
      path: "managedGroups.organizations.0",
    },
    {
      rule: "an unknown extra field",
      account: body({ credential: "secret" }),
      path: "",
    },
  ])("should reject $rule", ({ account, path }) => {
    const result = parse(account);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(
      path,
    );
  });
});
