import { listManualGroups } from "#/domain/manual-groups/client/list-manual-groups.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

const group = {
  id: "01980e2d-6f9b-7000-9000-000000000001",
  name: "ANR CritMet",
};

describe("listManualGroups", () => {
  it("should parse the response into the group list", async () => {
    const { fetch, lastUrl } = stubFetch({ data: [group] });

    const groups = await listManualGroups(fetch);

    expect(new URL(lastUrl() ?? "").pathname).toBe("/manual-groups");
    expect(groups).toEqual([group]);
  });

  it("should throw on a non-2xx response", async () => {
    const { fetch } = stubFetch({}, 500);

    await expect(listManualGroups(fetch)).rejects.toThrow(/500/);
  });
});
