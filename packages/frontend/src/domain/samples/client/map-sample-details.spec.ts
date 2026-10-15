import { mapSampleDetails } from "#/domain/samples/client/map-sample-details.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

const response = {
  data: [
    {
      internalNumber: 42,
      igsn: "0123456789ABCDEFGHJKMNPQRS",
      name: "Basalt 42",
    },
  ],
};

describe("mapSampleDetails", () => {
  it("should ask for the given internal numbers and return their details", async () => {
    const { fetch, lastUrl } = stubFetch(response);

    const result = await mapSampleDetails([42, 7], fetch);

    const url = new URL(lastUrl() ?? "");
    expect(url.pathname).toBe("/api/samples/map/samples");
    expect(url.searchParams.get("numbers")).toBe("42,7");
    expect(result).toEqual(response);
  });
});
