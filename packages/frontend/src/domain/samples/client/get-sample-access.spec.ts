import { getSampleAccess } from "#/domain/samples/client/get-sample-access.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

const id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("getSampleAccess", () => {
  it("should ask the admin sample endpoint with the bearer token and grant access on a 200", async () => {
    const { fetch, lastUrl, lastInit } = stubFetch({ data: {} });

    const result = await getSampleAccess(id, "a-token", fetch);

    expect(new URL(lastUrl() ?? "").pathname).toBe(`/api/admin/samples/${id}`);
    expect(new Headers(lastInit()?.headers).get("Authorization")).toBe(
      "Bearer a-token",
    );
    expect(result).toBe(true);
  });

  it.each([403, 404])(
    "should refuse access when the api answers %i",
    async (status) => {
      const { fetch } = stubFetch({ error: "no" }, status);

      await expect(getSampleAccess(id, "a-token", fetch)).resolves.toBe(false);
    },
  );
});
