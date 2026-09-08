import { NO_MANAGED_GROUPS } from "../user/managed-groups.ts";
import { serviceAccountBodySchema } from "./service-account-validator.ts";

const ORLEANS = "014zrew76";
const LORRAINE = "04vfs2w97";

const body = (overrides: object) => ({
  name: "Gaia Data",
  ownerId: "b0f3f6a4-1f4c-4f3a-9a2e-6c1d5e9b7a01",
  institutionalOrganization: ORLEANS,
  institutionalOsu: null,
  institutionalLaboratory: "UMR7327",
  managedGroups: NO_MANAGED_GROUPS,
  ...overrides,
});

const parse = (account: object) => serviceAccountBodySchema.safeParse(account);

describe("serviceAccountBodySchema", () => {
  it("should accept an organization and its laboratory without an OSU nor managed groups", () => {
    expect(parse(body({})).success).toBe(true);
  });

  it.each([
    { rule: "a blank name", account: body({ name: "   " }), path: "name" },
    {
      rule: "a name over 100 characters",
      account: body({ name: "a".repeat(101) }),
      path: "name",
    },
    {
      rule: "a laboratory outside the submitted organization",
      account: body({ institutionalOrganization: LORRAINE }),
      path: "institutionalLaboratory",
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
