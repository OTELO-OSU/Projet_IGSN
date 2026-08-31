import { describe, expect, it } from "vitest";

import { appUrl } from "./app-url.ts";

describe("appUrl", () => {
  it.each([
    ["https://igsn.example.test/admin", "https://igsn.example.test/admin/"],
    ["https://igsn.example.test/admin/", "https://igsn.example.test/admin/"],
    ["https://igsn.example.test", "https://igsn.example.test/"],
    ["https://igsn.example.test/", "https://igsn.example.test/"],
  ])(
    "should end %s with a slash so a relative link resolves under its path",
    (value, expected) => {
      expect(appUrl("ADMIN_URL", { ADMIN_URL: value })).toBe(expected);
    },
  );
});
