import { getSampleLineage } from "#/domain/samples/client/get-sample-lineage.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

const igsn = "0123456789ABCDEFGHJKMNPQRS";

const lineageJson = {
  nodes: [
    {
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      igsn: "0123456789ABCDEFGHJKMNPQRT",
      name: "Basalt 41",
      material: "rock_and_sediment.rock.igneous",
      generation: -1,
      tombstone: false,
    },
    {
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
      igsn,
      name: "Basalt 42",
      material: null,
      generation: 0,
      tombstone: false,
    },
  ],
  edges: [
    {
      parentId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      childId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
    },
  ],
  truncated: false,
};

describe("getSampleLineage", () => {
  it("should parse the response into a lineage graph", async () => {
    const { fetch, lastUrl } = stubFetch({ data: lineageJson });

    const result = await getSampleLineage(igsn, fetch);

    expect(new URL(lastUrl() ?? "").pathname).toBe(
      `/api/samples/${igsn}/lineage`,
    );
    expect(result).toEqual(lineageJson);
  });

  it("should return an empty graph on a 404", async () => {
    const { fetch } = stubFetch({ error: "Sample not found" }, 404);

    await expect(getSampleLineage(igsn, fetch)).resolves.toEqual({
      nodes: [],
      edges: [],
      truncated: false,
    });
  });

  it("should throw on a non-2xx response", async () => {
    const { fetch } = stubFetch({}, 500);

    await expect(getSampleLineage(igsn, fetch)).rejects.toThrow(/500/);
  });

  it("should throw when the response shape is invalid", async () => {
    const { fetch } = stubFetch({ data: { nodes: [{ id: "not-a-uuid" }] } });

    await expect(getSampleLineage(igsn, fetch)).rejects.toThrow();
  });
});
