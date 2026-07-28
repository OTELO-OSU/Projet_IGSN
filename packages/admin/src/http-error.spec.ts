import { HttpError, shouldRetry } from "./http-error.ts";

describe("shouldRetry", () => {
  // 403 is another researcher's sample, the failure the page renders directly.
  it.each([400, 403, 404, 409])("should not retry a %i", (status) => {
    expect(shouldRetry(0, new HttpError(status, "rejected"))).toBe(false);
  });

  it.each([500, 503])("should retry a %i", (status) => {
    expect(shouldRetry(0, new HttpError(status, "boom"))).toBe(true);
  });

  // A failed fetch throws a plain Error, with no status to judge it by.
  it("should retry a network failure", () => {
    expect(shouldRetry(0, new Error("fetch failed"))).toBe(true);
  });

  it("should give up after three attempts", () => {
    expect(shouldRetry(3, new Error("fetch failed"))).toBe(false);
  });
});
