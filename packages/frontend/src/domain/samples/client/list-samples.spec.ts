import { listSamples } from "#/domain/samples/client/list-samples.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

const iso = "2026-01-02T03:04:05.000Z";

const sampleJson = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Basalt 42",
  nature: "hand_sample",
  type: null,
  material: "rock.igneous",
  texture: null,
  collectionMethod: null,
  specificName: "BAS-42-001",
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  published: true,
  createdAt: iso,
  updatedAt: iso,
};

describe("listSamples", () => {
  it("should parse the response into data and total", async () => {
    const { fetch } = stubFetch({ data: [sampleJson], meta: { total: 7 } });

    const result = await listSamples({ page: 1, perPage: 25 }, fetch);

    expect(result).toEqual({
      total: 7,
      data: [
        {
          id: sampleJson.id,
          name: "Basalt 42",
          nature: "hand_sample",
          type: null,
          material: "rock.igneous",
          texture: null,
          collectionMethod: null,
          specificName: "BAS-42-001",
          igsn: "0123456789ABCDEFGHJKMNPQRS",
          published: true,
          createdAt: new Date(iso),
          updatedAt: new Date(iso),
        },
      ],
    });
  });

  it("should send page and perPage as query params", async () => {
    const { fetch, lastUrl } = stubFetch({ data: [], meta: { total: 0 } });

    await listSamples({ page: 3, perPage: 50 }, fetch);

    const url = new URL(lastUrl() ?? "");
    expect(url.pathname).toBe("/samples");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("perPage")).toBe("50");
  });

  it("should send the search term as a query param when provided", async () => {
    const { fetch, lastUrl } = stubFetch({ data: [], meta: { total: 0 } });

    await listSamples({ page: 1, perPage: 25, search: "granite" }, fetch);

    expect(new URL(lastUrl() ?? "").searchParams.get("search")).toBe("granite");
  });

  it("should omit the search param when not provided", async () => {
    const { fetch, lastUrl } = stubFetch({ data: [], meta: { total: 0 } });

    await listSamples({ page: 1, perPage: 25 }, fetch);

    expect(new URL(lastUrl() ?? "").searchParams.has("search")).toBe(false);
  });

  it("should throw on a non-2xx response", async () => {
    const { fetch } = stubFetch({}, 500);

    await expect(listSamples({ page: 1, perPage: 25 }, fetch)).rejects.toThrow(
      /500/,
    );
  });

  it("should throw when the response shape is invalid", async () => {
    const { fetch } = stubFetch({ data: [{ id: "not-a-uuid" }] });

    await expect(
      listSamples({ page: 1, perPage: 25 }, fetch),
    ).rejects.toThrow();
  });
});
