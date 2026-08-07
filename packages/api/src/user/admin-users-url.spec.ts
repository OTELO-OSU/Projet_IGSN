import { describe, expect, it } from "vitest";

import { adminUsersUrl } from "./admin-users-url.ts";

describe("adminUsersUrl", () => {
  it.each([
    { ADMIN_URL: "http://localhost:3001", url: "http://localhost:3001/users" },
    { ADMIN_URL: "http://localhost:3001/", url: "http://localhost:3001/users" },
  ])("should point at the users list of $ADMIN_URL", ({ ADMIN_URL, url }) => {
    expect(adminUsersUrl({ ADMIN_URL })).toBe(url);
  });

  it.each([{ ADMIN_URL: undefined }, { ADMIN_URL: "nope" }])(
    "should refuse to boot on ADMIN_URL=$ADMIN_URL",
    (env) => {
      expect(() => adminUsersUrl(env)).toThrow();
    },
  );
});
