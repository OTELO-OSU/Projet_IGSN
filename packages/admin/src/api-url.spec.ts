import { API_URL } from "./api-url.ts";

describe("API_URL", () => {
  it("should keep the api path prefix when a relative admin path resolves against it", () => {
    expect(new URL("admin/users", API_URL).pathname).toBe("/api/admin/users");
  });
});
