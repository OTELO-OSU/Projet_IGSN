import { listPublicUsers } from "#/domain/users/client/list-public-users.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

const user = {
  id: "01980e2d-6f9b-7000-9000-000000000001",
  name: "Dupont",
  firstname: "Marie",
};

describe("listPublicUsers", () => {
  it("should parse the response into the contributor list", async () => {
    const { fetch, lastUrl } = stubFetch({ data: [user] });

    const contributors = await listPublicUsers(undefined, fetch);

    expect(new URL(lastUrl() ?? "").pathname).toBe("/users");
    expect(contributors).toEqual([user]);
  });

  it("should ask the api to include the selected contributor", async () => {
    const { fetch, lastUrl } = stubFetch({ data: [user] });

    await listPublicUsers(user.id, fetch);

    expect(new URL(lastUrl() ?? "").search).toBe(`?include=${user.id}`);
  });

  it("should throw on a non-2xx response", async () => {
    const { fetch } = stubFetch({}, 500);

    await expect(listPublicUsers(undefined, fetch)).rejects.toThrow(/500/);
  });

  it("should throw when the response shape is invalid", async () => {
    const { fetch } = stubFetch({ data: [{ id: "not-a-uuid", name: "x" }] });

    await expect(listPublicUsers(undefined, fetch)).rejects.toThrow();
  });
});
