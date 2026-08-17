import { DEFAULT_UPLOAD_LIMIT } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { describe, expect, it, vi } from "vitest";

async function importLimit(value: string | undefined) {
  if (value === undefined) delete process.env.UPLOAD_LIMIT;
  else process.env.UPLOAD_LIMIT = value;
  vi.resetModules();
  return (await import("./upload-limit.ts")).uploadLimit;
}

describe("uploadLimit", () => {
  it("should read the value from the env", async () => {
    expect(await importLimit("3")).toBe(3);
  });

  it.each(["abc", undefined])(
    "should fall back to the default on %j",
    async (value) => {
      expect(await importLimit(value)).toBe(DEFAULT_UPLOAD_LIMIT);
    },
  );
});
