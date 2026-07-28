import { describe, expect, it, vi } from "vitest";

const DEFAULT = 0.8;

// The threshold is read at import, so each case needs a fresh module.
async function importThreshold(value: string | undefined) {
  if (value === undefined) delete process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD;
  else process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD = value;
  vi.resetModules();
  return (await import("./fuzzy-threshold.ts")).fuzzyThreshold;
}

describe("fuzzyThreshold", () => {
  it.each(["0.7", "0.9", "1"])("should read %j from the env", async (value) => {
    expect(await importThreshold(value)).toBe(Number(value));
  });

  it.each(["abc", "1.5", "-1", "0", "", "  ", undefined])(
    "should fall back to the default on %j",
    async (value) => {
      expect(await importThreshold(value)).toBe(DEFAULT);
    },
  );
});
