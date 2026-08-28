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
  metamorphicFacies: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: "BAS-42-001",
  location: null,
  description: null,
  condition: null,
  security: null,
  availability: "exists",
  publicationYear: 2026,
  economicInterest: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  status: "published",
  createdAt: iso,
  updatedAt: iso,
};

describe("listSamples", () => {
  it("should parse the response into data and total", async () => {
    const { fetch } = stubFetch({ data: [sampleJson], meta: { total: 7 } });

    const result = await listSamples({ page: 1, perPage: 25 }, fetch);

    expect(result).toEqual({ total: 7, data: [sampleJson] });
  });

  it("should send page and perPage as query params", async () => {
    const { fetch, lastUrl } = stubFetch({ data: [], meta: { total: 0 } });

    await listSamples({ page: 3, perPage: 50 }, fetch);

    const url = new URL(lastUrl() ?? "");
    expect(url.pathname).toBe("/samples");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("perPage")).toBe("50");
  });

  it.each([
    ["search", "granite"],
    ["bbox", "-10,40,10,50"],
  ])("should send %s as a query param when provided", async (param, value) => {
    const { fetch, lastUrl } = stubFetch({ data: [], meta: { total: 0 } });

    await listSamples({ page: 1, perPage: 25, [param]: value }, fetch);

    expect(new URL(lastUrl() ?? "").searchParams.get(param)).toBe(value);
  });

  it.each(["search", "bbox"])(
    "should omit the %s param when not provided",
    async (param) => {
      const { fetch, lastUrl } = stubFetch({ data: [], meta: { total: 0 } });

      await listSamples({ page: 1, perPage: 25 }, fetch);

      expect(new URL(lastUrl() ?? "").searchParams.has(param)).toBe(false);
    },
  );

  it("should throw with the status and the response body on a non-2xx response", async () => {
    const { fetch } = stubFetch({ error: "boom" }, 500);

    await expect(listSamples({ page: 1, perPage: 25 }, fetch)).rejects.toThrow(
      'Failed to load samples (500): {"error":"boom"}',
    );
  });

  it("should return a sample missing an optional field instead of throwing", async () => {
    const { availability: _availability, ...withoutAvailability } = sampleJson;
    const { fetch } = stubFetch({
      data: [withoutAvailability],
      meta: { total: 1 },
    });

    const result = await listSamples({ page: 1, perPage: 25 }, fetch);

    expect(result).toEqual({ total: 1, data: [withoutAvailability] });
  });
});
