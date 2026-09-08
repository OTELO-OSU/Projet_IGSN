import { isUnderBase, safeReturnPath } from "./safe-return-path.ts";

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
    ["/admin/", "/"],
    ["/admin", "/"],
  ])("should strip the base path from %s", (path, expected) => {
    expect(safeReturnPath(path, "/admin/")).toBe(expected);
  });

  it("should fall back to the home page for the callback under a base path", () => {
    expect(safeReturnPath("/admin/auth/callback", "/admin/")).toBe("/");
  });
});

describe("isUnderBase", () => {
  it.each([
    ["/admin/x", true],
    ["/admin", true],
    ["/administration", false],
    ["/samples/x", false],
  ])("should report %s under the base path as %s", (path, expected) => {
    expect(isUnderBase(path, "/admin/")).toBe(expected);
  });
});
