import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publishToDataGouv } from "./publish-to-data-gouv.ts";

const CONFIG = {
  url: "https://demo.data.gouv.fr",
  datasetId: "6accaa852f4ae7724956d181",
  token: "secret",
};

const DATASET = `${CONFIG.url}/api/1/datasets/${CONFIG.datasetId}`;

const FILES = [
  { fileName: "samples.csv", content: "igsn\r\nA1\r\n" },
  { fileName: "relations.csv", content: "igsn\r\n" },
  { fileName: "README.txt", content: "# IGSN\n" },
];

const DESCRIPTION = "Every published sample.";

const RESOURCES = [
  { id: "r-samples", title: "samples.csv" },
  { id: "r-other", title: "other.csv" },
];

const answer = (url: string) =>
  url.endsWith("/upload/")
    ? Response.json({ id: "r-new", title: "uploaded" })
    : Response.json({ private: true, resources: RESOURCES });

describe("publishToDataGouv", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (url: string) => answer(url));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("should replace the resource titled with the file name, create a missing one titled with it, a README as documentation, then describe the dataset keeping it private", async () => {
    await publishToDataGouv(CONFIG, DESCRIPTION, FILES);

    expect(
      fetchMock.mock.calls.map(([url, init]) => ({
        url,
        method: init.method ?? "GET",
        json: typeof init.body === "string" ? JSON.parse(init.body) : null,
      })),
    ).toEqual([
      { url: `${DATASET}/`, method: "GET", json: null },
      {
        url: `${DATASET}/resources/r-samples/upload/`,
        method: "POST",
        json: null,
      },
      { url: `${DATASET}/upload/`, method: "POST", json: null },
      {
        url: `${DATASET}/resources/r-new/`,
        method: "PUT",
        json: { title: "relations.csv", type: "main" },
      },
      { url: `${DATASET}/upload/`, method: "POST", json: null },
      {
        url: `${DATASET}/resources/r-new/`,
        method: "PUT",
        json: { title: "README.txt", type: "documentation" },
      },
      {
        url: `${DATASET}/`,
        method: "PUT",
        json: { description: DESCRIPTION, private: true },
      },
    ]);
  });

  it("should send the API key on every call", async () => {
    await publishToDataGouv(CONFIG, DESCRIPTION, FILES);

    expect(
      fetchMock.mock.calls.map(([, init]) => init.headers["X-API-KEY"]),
    ).toEqual(Array(7).fill(CONFIG.token));
  });

  it("should upload each file under its name, as CSV or plain text", async () => {
    await publishToDataGouv(CONFIG, DESCRIPTION, FILES);

    const files = fetchMock.mock.calls
      .filter(([, init]) => init.body instanceof FormData)
      .map(([, init]) => init.body.get("file") as File);
    expect(
      await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          type: file.type,
          content: await file.text(),
        })),
      ),
    ).toEqual(
      FILES.map(({ fileName, content }) => ({
        name: fileName,
        type: fileName.endsWith(".txt") ? "text/plain" : "text/csv",
        content,
      })),
    );
  });

  it.each([
    { call: "the dataset read", failing: "/" },
    { call: "an upload", failing: "/upload/" },
    { call: "a title update", failing: "/resources/r-new/" },
  ])("should throw when $call answers an error", async ({ failing }) => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith(failing)
        ? Response.json({ message: "Unsupported extension" }, { status: 400 })
        : answer(url),
    );

    await expect(publishToDataGouv(CONFIG, DESCRIPTION, FILES)).rejects.toThrow(
      /400 .*Unsupported extension/,
    );
  });
});
