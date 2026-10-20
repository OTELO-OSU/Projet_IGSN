import { safeReturnPath } from "./safe-return-path.ts";

describe("safeReturnPath", () => {
  it.each(["/samples/x", "/samples/x?y=1", "/samples/a%20b?q=c%2Fd"])(
    "should return %s, an app-local path, unchanged",
    (path) => {
      expect(safeReturnPath(path)).toBe(path);
    },
  );

  it.each([
    undefined,
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "/auth/callback",
    "/\t/evil.com",
    "/\n/evil.com",
    "/ok\\evil",
  ])("should fall back to the home page for %s", (urlState) => {
    expect(safeReturnPath(urlState)).toBe("/");
  });

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

  it.each(["/samples/x", "/administration"])(
    "should fall back to the home page for %s, outside the base path",
    (path) => {
      expect(safeReturnPath(path, "/admin/")).toBe("/");
    },
  );
});
