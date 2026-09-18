import { FIELD_SAMPLE } from "@projet-igsn/domain/sample/core/core-sample-fixture";
import { HTTPException } from "hono/http-exception";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerDoi } from "./register-doi.ts";

const KEY = "topsecret";

const DOI = `10.5072/${FIELD_SAMPLE.igsn}`;

describe("registerDoi", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    process.env.DATACITE_API_HOST = "http://datacite.test";
    process.env.DATACITE_API_KEY = KEY;
    process.env.DATACITE_DOI_PREFIX = "10.5072";
    process.env.FRONTEND_URL = "http://localhost:3000";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it.each([
    {
      rule: "DataCite is not configured",
      arrange: () => {
        delete process.env.DATACITE_API_HOST;
        return FIELD_SAMPLE;
      },
    },
    {
      rule: "the sample carries no DOI prefix",
      arrange: () => ({ ...FIELD_SAMPLE, doiPrefix: null }),
    },
  ])("should register nothing when $rule", async ({ arrange }) => {
    // Arrange
    const sample = arrange();
    // Act
    await registerDoi(sample, "publish");
    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should PUT the DataCite record under the sample's DOI", async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
    // Act
    await registerDoi(FIELD_SAMPLE, "publish");
    // Assert
    expect(fetchMock).toHaveBeenCalledWith(
      `http://datacite.test/dois/${DOI}`,
      expect.objectContaining({
        method: "PUT",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
      }),
    );
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body).data).toMatchObject({
      type: "dois",
      attributes: { doi: DOI, event: "publish" },
    });
  });

  it.each([
    {
      rule: "refuses the record",
      arrange: () =>
        fetchMock.mockResolvedValue(
          new Response("bad prefix", { status: 500 }),
        ),
    },
    {
      rule: "is unreachable",
      arrange: () => fetchMock.mockRejectedValue(new Error("network down")),
    },
  ])(
    "should reject with a 502 and trace it without the key when DataCite $rule",
    async ({ arrange }) => {
      // Arrange
      arrange();
      const logged = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      // Act
      const error = await registerDoi(FIELD_SAMPLE, "publish").catch(
        (reason: unknown) => reason,
      );
      // Assert
      expect(error).toBeInstanceOf(HTTPException);
      expect(error).toMatchObject({
        status: 502,
        message: "DOI registration failed",
      });
      expect(logged).toHaveBeenCalled();
      expect(JSON.stringify(logged.mock.calls)).not.toContain(KEY);
    },
  );
});
