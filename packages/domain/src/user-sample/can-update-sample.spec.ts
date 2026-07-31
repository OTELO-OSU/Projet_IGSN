import { canUpdateSample } from "./can-update-sample.ts";

describe("canUpdateSample", () => {
  it("should let the owner update a draft", () => {
    expect(canUpdateSample("owner", { published: false })).toBe(true);
  });

  it("should let the owner update a published sample", () => {
    expect(canUpdateSample("owner", { published: true })).toBe(true);
  });

  it("should let a contributor update a draft", () => {
    expect(canUpdateSample("contributor", { published: false })).toBe(true);
  });

  it("should refuse a contributor on a published sample", () => {
    expect(canUpdateSample("contributor", { published: true })).toBe(false);
  });

  it.each([false, true])(
    "should refuse a roleless reader on a sample published=%s",
    (published) => {
      expect(canUpdateSample(null, { published })).toBe(false);
    },
  );
});
