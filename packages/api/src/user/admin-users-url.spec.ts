import { describe, expect, it } from "vitest";

import { adminUsersUrl } from "./admin-users-url.ts";

describe("adminUsersUrl", () => {
  it.each([
    { ADMIN_URL: "http://localhost:3001" },
    { ADMIN_URL: "http://localhost:3001/" },
  ])("should point at the users list of $ADMIN_URL", (env) => {
    expect(adminUsersUrl(env)).toBe("http://localhost:3001/users");
  });

  it("should keep the host of a deployed admin", () => {
    expect(adminUsersUrl({ ADMIN_URL: "https://igsn-admin.example.org" })).toBe(
      "https://igsn-admin.example.org/users",
    );
  });

  it.each([{ ADMIN_URL: undefined }, { ADMIN_URL: "" }, { ADMIN_URL: "nope" }])(
    "should refuse to boot on ADMIN_URL=$ADMIN_URL",
    (env) => {
      expect(() => adminUsersUrl(env)).toThrow();
    },
  );
});
