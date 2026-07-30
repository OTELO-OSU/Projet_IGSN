import { DEFAULT_UPLOAD_LIMIT } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { describe, expect, it, vi } from "vitest";

// The limit is read at import, so each case needs a fresh module.
async function importLimit(value: string | undefined) {
  if (value === undefined) delete process.env.UPLOAD_LIMIT;
  else process.env.UPLOAD_LIMIT = value;
  vi.resetModules();
  return (await import("./upload-limit.ts")).uploadLimit;
}

describe("uploadLimit", () => {
  it.each(["1", "3", "20"])("should read %j from the env", async (value) => {
    expect(await importLimit(value)).toBe(Number(value));
  });

  it.each(["abc", "0", "-1", "2.5", "", "  ", undefined])(
    "should fall back to the default on %j",
    async (value) => {
      expect(await importLimit(value)).toBe(DEFAULT_UPLOAD_LIMIT);
    },
  );
});
