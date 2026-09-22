import type { Sample } from "@projet-igsn/domain/sample/sample";

import { FIELD_SAMPLE } from "@projet-igsn/domain/sample/core/core-sample-fixture";
import { HTTPException } from "hono/http-exception";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { syncDoi } from "./sync-doi.ts";

const KEY = "topsecret";

const CONFIG = { host: "http://datacite.test", key: KEY, prefix: "10.5072" };

const DOI = `${CONFIG.prefix}/${FIELD_SAMPLE.igsn}`;

const LANDING_PAGE = `http://localhost:3000/samples/${FIELD_SAMPLE.igsn}`;

describe("syncDoi", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    process.env.FRONTEND_URL = "http://localhost:3000";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("should PUT the DataCite record under the sample's DOI", async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
    // Act
    await syncDoi(CONFIG, FIELD_SAMPLE);
    // Assert
    expect(fetchMock).toHaveBeenCalledWith(
      `${CONFIG.host}/dois/${DOI}`,
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
    { rule: "DataCite is not configured", config: null, sample: FIELD_SAMPLE },
    {
      rule: "the sample carries no DOI prefix",
      config: CONFIG,
      sample: { ...FIELD_SAMPLE, doiPrefix: null },
    },
  ])("should send nothing when $rule", async ({ config, sample }) => {
    // Arrange
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
    // Act
    await syncDoi(config, sample);
    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { status: "published" as const, event: "publish", url: LANDING_PAGE },
    { status: "withdrawn" as const, event: "hide", url: LANDING_PAGE },
    {
      status: "tombstone" as const,
      event: "hide",
      url: "http://localhost:3000/tombstone",
    },
  ])(
    "should send the $event event and the $url url for a $status sample",
    async ({ status, event, url }) => {
      // Arrange
      fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
      const sample: Sample = { ...FIELD_SAMPLE, status };
      // Act
      await syncDoi(CONFIG, sample);
      // Assert
      const [, init] = fetchMock.mock.calls[0]!;
      expect(JSON.parse(init.body).data.attributes).toMatchObject({
        doi: DOI,
        event,
        url,
      });
    },
  );

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
      const error = await syncDoi(CONFIG, FIELD_SAMPLE).catch(
        (reason: unknown) => reason,
      );
      // Assert
      expect(error).toBeInstanceOf(HTTPException);
      expect(error).toMatchObject({
        status: 502,
        message: "DOI sync failed",
      });
      expect(logged).toHaveBeenCalled();
      expect(JSON.stringify(logged.mock.calls)).not.toContain(KEY);
    },
  );
});
