import type { Sample } from "@projet-igsn/domain/sample/sample";

import { RESEARCH_PROJECT_SAMPLE } from "@projet-igsn/domain/sample/core/core-sample-fixture";
import { HTTPException } from "hono/http-exception";
import { afterEach, beforeEach, describe, expect, vi } from "vitest";

import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { pgTest } from "../tests/pg-test.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { syncDoi } from "./sync-doi.ts";

const KEY = "topsecret";

const CONFIG = { host: "http://datacite.test", key: KEY, prefix: "10.5072" };

const DOI = `${CONFIG.prefix}/${RESEARCH_PROJECT_SAMPLE.igsn}`;

const LANDING_PAGE = `http://localhost:3000/samples/${RESEARCH_PROJECT_SAMPLE.igsn}`;

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

  pgTest(
    "should PUT the DataCite record under the sample's DOI",
    async ({ db }) => {
      // Arrange
      fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
      // Act
      await syncDoi(CONFIG, db, RESEARCH_PROJECT_SAMPLE);
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
    },
  );

  pgTest.for([
    {
      rule: "DataCite is not configured",
      config: null,
      sample: RESEARCH_PROJECT_SAMPLE,
    },
    {
      rule: "the sample carries no DOI prefix",
      config: CONFIG,
      sample: { ...RESEARCH_PROJECT_SAMPLE, doiPrefix: null },
    },
  ])("should send nothing when $rule", async ({ config, sample }, { db }) => {
    // Arrange
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
    // Act
    await syncDoi(config, db, sample);
    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
  });

  pgTest.for([
    { status: "published" as const, event: "publish", url: LANDING_PAGE },
    { status: "withdrawn" as const, event: "hide", url: LANDING_PAGE },
    {
      status: "tombstone" as const,
      event: "hide",
      url: "http://localhost:3000/tombstone",
    },
  ])(
    "should send the $event event and the $url url for a $status sample",
    async ({ status, event, url }, { db }) => {
      // Arrange
      fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
      const sample: Sample = { ...RESEARCH_PROJECT_SAMPLE, status };
      // Act
      await syncDoi(CONFIG, db, sample);
      // Assert
      const [, init] = fetchMock.mock.calls[0]!;
      expect(JSON.parse(init.body).data.attributes).toMatchObject({
        doi: DOI,
        event,
        url,
      });
    },
  );

  pgTest.for([
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
    async ({ arrange }, { db }) => {
      // Arrange
      arrange();
      const logged = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      // Act
      const error = await syncDoi(CONFIG, db, RESEARCH_PROJECT_SAMPLE).catch(
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

  pgTest(
    "should list each child holding an IGSN as IsSourceOf, omitting a draft child",
    async ({ db }) => {
      // Arrange
      fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
      const { id } = await insertSample(db, publishableSample);
      const sample = (await publishSample(db, id))!;
      const child = await insertSample(db, {
        ...publishableSample,
        parentIds: [id],
      });
      const { igsn } = (await publishSample(db, child.id))!;
      await insertSample(db, { ...publishableSample, parentIds: [id] });
      // Act
      await syncDoi(CONFIG, db, { ...sample, doiPrefix: CONFIG.prefix });
      // Assert
      const [, init] = fetchMock.mock.calls[0]!;
      expect(
        JSON.parse(init.body)
          .data.attributes.relatedIdentifiers.filter(
            ({ relationType }: { relationType: string }) =>
              relationType === "IsSourceOf",
          )
          .map(
            ({ relatedIdentifier }: { relatedIdentifier: string }) =>
              relatedIdentifier,
          ),
      ).toEqual([igsn]);
    },
  );
});
