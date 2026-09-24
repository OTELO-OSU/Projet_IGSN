import { describe, expect, it, vi } from "vitest";

import { cacheBuild } from "./cache-build.ts";

describe("cacheBuild", () => {
  it("should build once and answer every later caller from that build", async () => {
    const build = vi.fn(() => Promise.resolve("workbook"));
    const cached = cacheBuild(build);

    expect([await cached(), await cached()]).toEqual(["workbook", "workbook"]);
    expect(build).toHaveBeenCalledOnce();
  });

  it("should forget a failed build so the next caller builds again", async () => {
    const build = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("exceljs failed"))
      .mockResolvedValueOnce("workbook");
    const cached = cacheBuild(build);

    await expect(cached()).rejects.toThrow("exceljs failed");

    expect(await cached()).toBe("workbook");
  });
});
