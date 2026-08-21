import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE } from "../sample/sample-validator.ts";
import { NO_MANAGED_GROUPS } from "./managed-groups.ts";
import { listUsersQuerySchema, updateUserSchema } from "./user-validator.ts";

describe("listUsersQuerySchema", () => {
  it.each([
    ["an empty query", {}],
    [
      "an unknown status or page size",
      { page: "0", perPage: "7", status: "banned" },
    ],
  ])("should fall back to the defaults on %s", (_case, query) => {
    expect(listUsersQuerySchema.parse(query)).toEqual({
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
      status: undefined,
    });
  });

  it("should coerce a page and keep a known status filter", () => {
    expect(
      listUsersQuerySchema.parse({ page: "3", status: "pending" }),
    ).toEqual({ page: 3, perPage: DEFAULT_PAGE_SIZE, status: "pending" });
  });

  it("should read an empty value as no institutional filter", () => {
    expect(
      listUsersQuerySchema.parse({
        institutionalOrganization: "",
        institutionalOsu: "",
        institutionalLaboratory: "",
      }),
    ).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
      institutionalOrganization: undefined,
      institutionalOsu: undefined,
      institutionalLaboratory: undefined,
    });
  });
});

const TRIO = {
  institutionalOrganization: "04vfs2w97",
  institutionalOsu: "OTELo",
  institutionalLaboratory: "UMR7358",
};

const NO_MODERATION = { managedGroups: NO_MANAGED_GROUPS };

const NO_TRIO = {
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
};

describe("updateUserSchema", () => {
  it.each([
    [
      "a status, a whole institution and the picked groups",
      {
        status: "accepted",
        ...TRIO,
        ...NO_MODERATION,
        manualGroupIds: ["3f2504e0-4f89-41d3-9a0c-0305000000a1"],
      },
    ],
    [
      "an account that declared no institution yet",
      { status: "pending", ...NO_TRIO, ...NO_MODERATION, manualGroupIds: [] },
    ],
  ])("should accept %s", (_case, body) => {
    expect(updateUserSchema.safeParse(body).success).toBe(true);
  });

  it.each([
    ["an unknown field", { status: "accepted", ...TRIO, superAdmin: true }],
    [
      "an organization without its laboratory",
      {
        status: "accepted",
        ...NO_TRIO,
        institutionalOrganization: "04vfs2w97",
      },
    ],
    [
      "a laboratory without its organization",
      { status: "accepted", ...NO_TRIO, institutionalLaboratory: "UMR7358" },
    ],
  ])("should refuse %s", (_case, body) => {
    expect(
      updateUserSchema.safeParse({
        ...body,
        ...NO_MODERATION,
        manualGroupIds: [],
      }).success,
    ).toBe(false);
  });
});
