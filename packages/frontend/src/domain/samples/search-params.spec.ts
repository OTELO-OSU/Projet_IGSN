import {
  isLocationSearchActive,
  locationSearch,
  nextEngineSearch,
  searchParamsSchema,
  searchQueryParams,
} from "./search-params.ts";

describe("searchParamsSchema", () => {
  it("should default the engine to text", () => {
    expect(searchParamsSchema.parse({}).engine).toBe("text");
  });

  it("should fall back to text for an unknown engine", () => {
    expect(searchParamsSchema.parse({ engine: "satellite" }).engine).toBe(
      "text",
    );
  });

  it("should keep the location engine and the bbox string", () => {
    expect(
      searchParamsSchema.parse({ engine: "location", bbox: "-10,40,10,50" }),
    ).toMatchObject({ engine: "location", bbox: "-10,40,10,50" });
  });
});

describe("searchQueryParams", () => {
  it("should prefetch by bbox when location has a valid box", () => {
    expect(
      searchQueryParams({
        engine: "location",
        bbox: "-10,40,10,50",
        page: 1,
      }),
    ).toEqual({ page: 1, perPage: 50, bbox: "-10,40,10,50" });
  });

  it("should not prefetch when the location box is absent", () => {
    expect(searchQueryParams({ engine: "location", page: 1 })).toBeUndefined();
  });

  it("should not prefetch when the location box is invalid", () => {
    expect(
      searchQueryParams({ engine: "location", bbox: "-10,200,10,50", page: 1 }),
    ).toBeUndefined();
  });

  it("should prefetch by search when text has a query", () => {
    expect(
      searchQueryParams({ engine: "text", q: "granite", page: 2 }),
    ).toEqual({ page: 2, perPage: 50, search: "granite" });
  });

  it("should not prefetch an empty text search", () => {
    expect(searchQueryParams({ engine: "text", page: 1 })).toBeUndefined();
  });
});

describe("nextEngineSearch", () => {
  it("should drop the text query when switching to location", () => {
    expect(
      nextEngineSearch({ engine: "text", q: "granite", page: 3 }, "location"),
    ).toEqual({ engine: "location", page: 1 });
  });

  it("should drop the bbox when switching to text", () => {
    expect(
      nextEngineSearch(
        { engine: "location", bbox: "-10,40,10,50", page: 3 },
        "text",
      ),
    ).toEqual({ engine: "text", page: 1 });
  });
});

describe("locationSearch", () => {
  it("should build a location search on page 1 for the drawn box", () => {
    expect(locationSearch("-10,40,10,50")).toEqual({
      engine: "location",
      bbox: "-10,40,10,50",
      page: 1,
    });
  });
});

describe("isLocationSearchActive", () => {
  it("should be active only with the location engine and a valid box", () => {
    expect(
      isLocationSearchActive({
        engine: "location",
        bbox: "-10,40,10,50",
        page: 1,
      }),
    ).toBe(true);
    expect(isLocationSearchActive({ engine: "location", page: 1 })).toBe(false);
    expect(
      isLocationSearchActive({
        engine: "text",
        bbox: "-10,40,10,50",
        page: 1,
      }),
    ).toBe(false);
  });
});
