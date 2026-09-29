import { describe, expect, it } from "vitest";

import { sampleMapClusterSchema, sampleMapQuerySchema } from "./model.ts";

describe("sampleMapQuerySchema", () => {
  it("should keep the list filters, drop pagination and coerce the viewport and zoom", () => {
    expect(
      sampleMapQuerySchema.parse({
        search: "basalt",
        bbox: "-10,40,10,50",
        viewport: "170,-10,-170,10",
        zoom: "3",
        page: "2",
        perPage: "50",
      }),
    ).toEqual({
      search: "basalt",
      bbox: { west: -10, south: 40, east: 10, north: 50 },
      viewport: { west: 170, south: -10, east: -170, north: 10 },
      zoom: 3,
    });
  });

  it.each([
    { zoom: "3" },
    { viewport: "0,50,10,40", zoom: "3" },
    { viewport: "-10,40,10,50" },
    { viewport: "-10,40,10,50", zoom: "-1" },
    { viewport: "-10,40,10,50", zoom: "21" },
    { viewport: "-10,40,10,50", zoom: "2.5" },
  ])("should reject %o", (query) => {
    expect(sampleMapQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe("sampleMapClusterSchema", () => {
  it("should accept a multi-sample cluster without a sample", () => {
    expect(
      sampleMapClusterSchema.safeParse({
        longitude: 2,
        latitude: 45,
        count: 12,
        extent: { west: 1, south: 44, east: 3, north: 46 },
      }).success,
    ).toBe(true);
  });
});
