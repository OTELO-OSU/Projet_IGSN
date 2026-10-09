import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publishToDataGouv } from "./publish-to-data-gouv.ts";

const CONFIG = {
  url: "https://demo.data.gouv.fr",
  name: "igsn-samples",
  token: "secret",
};

const DATASET = `${CONFIG.url}/api/1/datasets/${CONFIG.name}`;

const TABLES = [
  { fileName: "samples.csv", csv: "igsn\r\nA1\r\n" },
  { fileName: "relations.csv", csv: "igsn\r\n" },
];

const RESOURCES = [
  { id: "r-samples", title: "samples.csv" },
  { id: "r-other", title: "other.csv" },
];

describe("publishToDataGouv", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/upload/")
        ? Response.json({})
        : Response.json({ resources: RESOURCES }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("should replace the resource titled with the file name and create a missing one", async () => {
    await publishToDataGouv(CONFIG, TABLES);

    expect(
      fetchMock.mock.calls.map(([url, init]) => ({
        url,
        method: init.method ?? "GET",
      })),
    ).toEqual([
      { url: `${DATASET}/`, method: "GET" },
      { url: `${DATASET}/resources/r-samples/upload/`, method: "POST" },
      { url: `${DATASET}/upload/`, method: "POST" },
    ]);
  });

  it("should send the API key on every call", async () => {
    await publishToDataGouv(CONFIG, TABLES);

    expect(
      fetchMock.mock.calls.map(([, init]) => init.headers["X-API-KEY"]),
    ).toEqual([CONFIG.token, CONFIG.token, CONFIG.token]);
  });

  it("should upload each table's CSV as a file named after the table", async () => {
    await publishToDataGouv(CONFIG, TABLES);

    const files = fetchMock.mock.calls
      .slice(1)
      .map(([, init]) => init.body.get("file") as File);
    expect(
      await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          csv: await file.text(),
        })),
      ),
    ).toEqual(TABLES.map(({ fileName, csv }) => ({ name: fileName, csv })));
  });

  it.each([
    { call: "the dataset read", failing: "/" },
    { call: "an upload", failing: "/upload/" },
  ])("should throw when $call answers an error", async ({ failing }) => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith(failing)
        ? new Response("{}", { status: 503 })
        : Response.json({ resources: RESOURCES }),
    );

    await expect(publishToDataGouv(CONFIG, TABLES)).rejects.toThrow(/503/);
  });
});
