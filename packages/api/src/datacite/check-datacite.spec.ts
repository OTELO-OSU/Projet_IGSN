import { afterEach, describe, expect, it, vi } from "vitest";

import { STUB_DATACITE_CONFIG } from "../tests/stub-datacite.ts";
import { checkDataCite } from "./check-datacite.ts";

describe("checkDataCite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should report DataCite available when none is configured", async () => {
    expect(await checkDataCite(null)).toBe(true);
  });

  it("should probe the DOI list with the configured key", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    // Act
    const available = await checkDataCite(STUB_DATACITE_CONFIG);
    // Assert
    expect(available).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `${STUB_DATACITE_CONFIG.host}/dois?page[size]=1`,
      expect.objectContaining({
        headers: { Authorization: `Bearer ${STUB_DATACITE_CONFIG.key}` },
      }),
    );
  });

  it.each([
    [
      "answers an error",
      () => Promise.resolve(new Response("", { status: 503 })),
    ],
    ["cannot be reached", () => Promise.reject(new TypeError("fetch failed"))],
  ])("should report DataCite unavailable when it %s", async (_, answer) => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn(answer));
    // Act
    const available = await checkDataCite(STUB_DATACITE_CONFIG);
    // Assert
    expect(available).toBe(false);
  });
});
