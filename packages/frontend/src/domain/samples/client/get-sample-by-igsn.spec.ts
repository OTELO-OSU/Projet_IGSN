import { getSampleByIgsn } from "#/domain/samples/client/get-sample-by-igsn.ts";

import { stubFetch } from "../../../../test/stub-fetch.ts";

const iso = "2026-01-02T03:04:05.000Z";
const igsn = "0123456789ABCDEFGHJKMNPQRS";

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
  igsn,
  published: true,
  createdAt: iso,
  updatedAt: iso,
};

describe("getSampleByIgsn", () => {
  it("should parse the response into a sample", async () => {
    const { fetch, lastUrl } = stubFetch({ data: sampleJson });

    const result = await getSampleByIgsn(igsn, fetch);

    expect(new URL(lastUrl() ?? "").pathname).toBe(`/samples/${igsn}`);
    expect(result).toEqual({
      id: sampleJson.id,
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
      age: null,
      links: [],
      attachments: [],
      security: null,
      availability: "exists",
      publicationYear: 2026,
      igsn,
      published: true,
      createdAt: new Date(iso),
      updatedAt: new Date(iso),
    });
  });

  it("should return null on a 404", async () => {
    const { fetch } = stubFetch({ error: "Sample not found" }, 404);

    await expect(getSampleByIgsn(igsn, fetch)).resolves.toBeNull();
  });

  it("should throw on a non-2xx response", async () => {
    const { fetch } = stubFetch({}, 500);

    await expect(getSampleByIgsn(igsn, fetch)).rejects.toThrow(/500/);
  });

  it("should throw when the response shape is invalid", async () => {
    const { fetch } = stubFetch({ data: { id: "not-a-uuid" } });

    await expect(getSampleByIgsn(igsn, fetch)).rejects.toThrow();
  });
});
