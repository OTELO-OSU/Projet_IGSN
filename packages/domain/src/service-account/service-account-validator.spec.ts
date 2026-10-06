import { NO_MANAGED_GROUPS } from "../user/managed-groups.ts";
import { serviceAccountBodySchema } from "./service-account-validator.ts";

const body = (overrides: object) => ({
  name: "Gaia Data",
  ownerId: "b0f3f6a4-1f4c-4f3a-9a2e-6c1d5e9b7a01",
  sampleOwnerId: "c1a4e7b5-2a5d-4b4b-8b3f-7d2e6f0c8b02",
  managedGroups: NO_MANAGED_GROUPS,
  ...overrides,
});

const parse = (account: object) => serviceAccountBodySchema.safeParse(account);

const issuePaths = (result: {
  error?: { issues: { path: PropertyKey[] }[] };
}) => result.error?.issues.map((issue) => issue.path.join("."));

describe("serviceAccountBodySchema", () => {
  it.each([
    { rule: "a blank name", account: body({ name: "   " }), path: "name" },
    {
      rule: "a name over 100 characters",
      account: body({ name: "a".repeat(101) }),
      path: "name",
    },
    {
      rule: "an unknown field",
      account: body({ institutionalOrganization: "014zrew76" }),
      path: "",
    },
  ])("should reject $rule", ({ account, path }) => {
    const result = parse(account);

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain(path);
  });
});
