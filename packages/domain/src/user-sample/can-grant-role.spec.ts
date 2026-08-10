import { canGrantRole } from "./can-grant-role.ts";

describe("canGrantRole", () => {
  it.each([
    { role: "owner" as const, granted: "editor" as const },
    { role: "owner" as const, granted: "contributor" as const },
    { role: "editor" as const, granted: "editor" as const },
    { role: "editor" as const, granted: "contributor" as const },
    { role: "contributor" as const, granted: "contributor" as const },
  ])("should let a $role invite a $granted", ({ role, granted }) => {
    expect(canGrantRole(role, granted)).toBe(true);
  });

  it.each([
    { role: "contributor" as const, granted: "editor" as const },
    { role: null, granted: "contributor" as const },
    { role: null, granted: "editor" as const },
  ])("should refuse a $role inviting a $granted", ({ role, granted }) => {
    expect(canGrantRole(role, granted)).toBe(false);
  });
});
