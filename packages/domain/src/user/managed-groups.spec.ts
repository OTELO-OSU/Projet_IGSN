import { describe, expect, it } from "vitest";

import { managedGroupsSchema, NO_MANAGED_GROUPS } from "./managed-groups.ts";

const BRGM = "05hnb7x64";
const MANUAL_GROUP_ID = "3f2504e0-4f89-41d3-9a0c-0305000000a1";

describe("managedGroupsSchema", () => {
  it.each([
    ["organization", { organizations: ["0zzzzzz99"] }],
    ["OSU", { osus: ["NOT-AN-OSU"] }],
    ["laboratory", { laboratories: ["NOT-A-LABORATORY"] }],
  ])("should reject an unknown %s", (_case, groups) => {
    expect(
      managedGroupsSchema.safeParse({ ...NO_MANAGED_GROUPS, ...groups })
        .success,
    ).toBe(false);
  });

  it("should accept an OSU that belongs to none of the managed organizations", () => {
    expect(
      managedGroupsSchema.parse({
        ...NO_MANAGED_GROUPS,
        organizations: [BRGM],
        osus: ["OSUNA"],
      }),
    ).toEqual({
      ...NO_MANAGED_GROUPS,
      organizations: [BRGM],
      osus: ["OSUNA"],
    });
  });

  it("should collapse duplicates", () => {
    expect(
      managedGroupsSchema.parse({
        organizations: [BRGM, BRGM],
        osus: ["OSUNA", "OSUNA"],
        laboratories: ["UMR7327", "UMR7327"],
        manualGroupIds: [MANUAL_GROUP_ID, MANUAL_GROUP_ID],
      }),
    ).toEqual({
      organizations: [BRGM],
      osus: ["OSUNA"],
      laboratories: ["UMR7327"],
      manualGroupIds: [MANUAL_GROUP_ID],
    });
  });
});
