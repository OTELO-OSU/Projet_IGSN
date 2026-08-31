import { safeReturnPath } from "./sign-in.ts";

describe("safeReturnPath", () => {
  it.each(["/samples/x", "/samples/x?y=1"])(
    "should return %s, an app-local path, unchanged",
    (path) => {
      expect(safeReturnPath(path)).toBe(path);
    },
  );

  it.each([undefined, "//evil.com", "https://evil.com", "/auth/callback"])(
    "should fall back to the home page for %s",
    (urlState) => {
      expect(safeReturnPath(urlState)).toBe("/");
    },
  );

  it.each([
    ["/admin/samples/x", "/samples/x"],
    ["/admin/samples/x?y=1", "/samples/x?y=1"],
    ["/admin/", "/"],
    ["/admin", "/"],
  ])("should strip the base path from %s", (path, expected) => {
    expect(safeReturnPath(path, "/admin/")).toBe(expected);
  });

  it.each([
    undefined,
    "//evil.com",
    "https://evil.com",
    "/admin/auth/callback",
  ])("should fall back to the home page for %s under a base path", (path) => {
    expect(safeReturnPath(path, "/admin/")).toBe("/");
  });
});
