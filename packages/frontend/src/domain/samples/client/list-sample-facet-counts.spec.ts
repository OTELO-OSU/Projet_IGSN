import type { ListSamplesParams } from "#/domain/samples/client/list-samples.ts";

import { listSampleFacetCounts } from "#/domain/samples/client/list-sample-facet-counts.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

describe("listSampleFacetCounts", () => {
  it("should return the parsed counts of each facet", async () => {
    const counts = { nature: { hand_sample: 3 }, type: { core: 2 } };
    const { fetch } = stubFetch({ data: counts });

    await expect(listSampleFacetCounts({}, fetch)).resolves.toEqual(counts);
  });

  it("should send the list search params without paging", async () => {
    const { fetch, lastUrl } = stubFetch({ data: {} });

    const params: ListSamplesParams = {
      page: 2,
      perPage: 50,
      search: "granite",
      bbox: "-10,40,10,50",
      filters: { nature: "hand_sample", texture: undefined },
    };

    await listSampleFacetCounts(params, fetch);

    const url = new URL(lastUrl() ?? "");
    expect(url.pathname).toBe("/api/samples/facets");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: "granite",
      bbox: "-10,40,10,50",
      nature: "hand_sample",
    });
  });

  it("should throw on a non-2xx response", async () => {
    const { fetch } = stubFetch({}, 500);

    await expect(listSampleFacetCounts({}, fetch)).rejects.toThrow(/500/);
  });
});
