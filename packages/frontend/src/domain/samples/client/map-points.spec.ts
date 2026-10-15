import { mapPoints } from "#/domain/samples/client/map-points.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

const response = {
  data: { numbers: [42], longitudes: [2.96], latitudes: [45.77] },
};

describe("mapPoints", () => {
  it("should send the search filters and return every matching point", async () => {
    const { fetch, lastUrl } = stubFetch(response);

    const result = await mapPoints(
      {
        search: "basalt",
        bbox: "-10,40,10,50",
        filters: { nature: "hand_sample" },
      },
      fetch,
    );

    const url = new URL(lastUrl() ?? "");
    expect(url.pathname).toBe("/api/samples/map/points");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: "basalt",
      bbox: "-10,40,10,50",
      nature: "hand_sample",
    });
    expect(result).toEqual(response);
  });
});
