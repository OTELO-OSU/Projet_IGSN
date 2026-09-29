import { mapSamples } from "#/domain/samples/client/map-samples.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

const response = {
  data: [
    {
      longitude: 2.96,
      latitude: 45.77,
      count: 1,
      extent: { west: 2.96, south: 45.77, east: 2.96, north: 45.77 },
      sample: {
        igsn: "0123456789ABCDEFGHJKMNPQRS",
        name: "Basalt 42",
        material: null,
      },
    },
  ],
  meta: { extent: { west: 2.96, south: 45.77, east: 2.96, north: 45.77 } },
};

describe("mapSamples", () => {
  it("should send the list filters with the viewport and zoom, and return the clusters", async () => {
    const { fetch, lastUrl } = stubFetch(response);

    const result = await mapSamples(
      {
        search: "basalt",
        bbox: "-10,40,10,50",
        filters: { nature: "hand_sample" },
        viewport: "-20,30,20,60",
        zoom: 4,
      },
      fetch,
    );

    const url = new URL(lastUrl() ?? "");
    expect(url.pathname).toBe("/api/samples/map");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: "basalt",
      bbox: "-10,40,10,50",
      nature: "hand_sample",
      viewport: "-20,30,20,60",
      zoom: "4",
    });
    expect(result).toEqual(response);
  });

  it("should throw on a non-2xx response", async () => {
    const { fetch } = stubFetch({}, 500);

    await expect(
      mapSamples({ viewport: "-180,-90,180,90", zoom: 2 }, fetch),
    ).rejects.toThrow(/500/);
  });
});
