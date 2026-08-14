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
});
