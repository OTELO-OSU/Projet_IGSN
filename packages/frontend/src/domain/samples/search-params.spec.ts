import {
  PER_PAGE,
  composeSeedFromParams,
  searchParamsSchema,
  searchQueryParams,
} from "./search-params.ts";

describe("searchParamsSchema", () => {
  it("should default the page to 1", () => {
    expect(searchParamsSchema.parse({}).page).toBe(1);
  });

  it("should keep both q and bbox at once", () => {
    expect(
      searchParamsSchema.parse({ q: "granite", bbox: "-10,40,10,50" }),
    ).toMatchObject({ q: "granite", bbox: "-10,40,10,50" });
  });

  it("should leave the page size unset when the URL carries none", () => {
    expect(searchParamsSchema.parse({}).perPage).toBeUndefined();
  });

  it.each([10, 25, 50])("should keep the chosen page size %s", (perPage) => {
    expect(searchParamsSchema.parse({ perPage: String(perPage) }).perPage).toBe(
      perPage,
    );
  });

  it.each(["0", "999", "abc"])(
    "should snap the unsupported page size %s to the default",
    (perPage) => {
      expect(searchParamsSchema.parse({ perPage }).perPage).toBe(PER_PAGE);
    },
  );

  it("should drop an unknown engine", () => {
    expect(searchParamsSchema.parse({ engine: "nope" }).engine).toBeUndefined();
  });

  it("should keep an empty param, which means its engine is open and unfilled", () => {
    expect(searchParamsSchema.parse({ q: "", bbox: "" })).toMatchObject({
      q: "",
      bbox: "",
    });
  });
});

describe("searchQueryParams", () => {
  it("should send both search and bbox when both are present", () => {
    expect(
      searchQueryParams({ q: "granite", bbox: "-10,40,10,50", page: 1 }),
    ).toEqual({
      page: 1,
      perPage: PER_PAGE,
      search: "granite",
      bbox: "-10,40,10,50",
      filters: {},
    });
  });

  it("should send the chosen page size", () => {
    expect(searchQueryParams({ q: "granite", page: 1, perPage: 25 })).toEqual({
      page: 1,
      perPage: 25,
      search: "granite",
      bbox: undefined,
      filters: {},
    });
  });

  it("should send only search when there is no bbox", () => {
    expect(searchQueryParams({ q: "granite", page: 2 })).toEqual({
      page: 2,
      perPage: PER_PAGE,
      search: "granite",
      filters: {},
    });
  });

  it("should send only bbox when there is a valid box and no query", () => {
    expect(searchQueryParams({ bbox: "-10,40,10,50", page: 1 })).toEqual({
      page: 1,
      perPage: PER_PAGE,
      bbox: "-10,40,10,50",
      filters: {},
    });
  });

  it("should ignore a malformed bbox but still send the query", () => {
    expect(
      searchQueryParams({ q: "granite", bbox: "-10,200,10,50", page: 1 }),
    ).toEqual({ page: 1, perPage: PER_PAGE, search: "granite", filters: {} });
  });

  it("should send the active facets alongside the query and the box", () => {
    expect(
      searchQueryParams({
        q: "granite",
        bbox: "-10,40,10,50",
        nature: "rock_powder",
        page: 1,
      }),
    ).toEqual({
      page: 1,
      perPage: PER_PAGE,
      search: "granite",
      bbox: "-10,40,10,50",
      filters: { nature: "rock_powder" },
    });
  });

  it("should search on a facet alone", () => {
    expect(searchQueryParams({ nature: "rock_powder", page: 1 })).toEqual({
      page: 1,
      perPage: PER_PAGE,
      search: undefined,
      bbox: undefined,
      filters: { nature: "rock_powder" },
    });
  });

  it("should return undefined when nothing is usable", () => {
    expect(
      searchQueryParams({ bbox: "-10,200,10,50", page: 1 }),
    ).toBeUndefined();
    expect(searchQueryParams({ page: 1 })).toBeUndefined();
  });

  it("should not search on engines that are open but unfilled", () => {
    expect(searchQueryParams({ q: "", bbox: "", page: 1 })).toBeUndefined();
  });
});

describe("composeSeedFromParams", () => {
  it("should seed text only from a query", () => {
    expect(composeSeedFromParams({ q: "granite", page: 1 })).toEqual({
      active: ["text"],
      drafts: { q: "granite", bbox: undefined },
    });
  });

  it("should seed location only from a valid box", () => {
    expect(composeSeedFromParams({ bbox: "-10,40,10,50", page: 1 })).toEqual({
      active: ["location"],
      drafts: { q: undefined, bbox: "-10,40,10,50" },
    });
  });

  it("should seed both engines when both params are present", () => {
    expect(
      composeSeedFromParams({ q: "granite", bbox: "-10,40,10,50", page: 1 }),
    ).toEqual({
      active: ["text", "location"],
      drafts: { q: "granite", bbox: "-10,40,10,50" },
    });
  });

  it("should show the engine the reader searched from first", () => {
    expect(
      composeSeedFromParams({
        q: "granite",
        bbox: "-10,40,10,50",
        engine: "location",
        page: 1,
      }),
    ).toEqual({
      active: ["location", "text"],
      drafts: { q: "granite", bbox: "-10,40,10,50" },
    });
  });

  it("should ignore an engine whose param the URL dropped", () => {
    expect(
      composeSeedFromParams({ q: "granite", engine: "location", page: 1 }),
    ).toEqual({
      active: ["text"],
      drafts: { q: "granite", bbox: undefined },
    });
  });

  it("should default to text when nothing is present", () => {
    expect(composeSeedFromParams({ page: 1 })).toEqual({
      active: ["text"],
      drafts: { q: undefined, bbox: undefined },
    });
  });

  it("should keep an engine whose param is present but empty", () => {
    expect(composeSeedFromParams({ q: "granite", bbox: "", page: 1 })).toEqual({
      active: ["text", "location"],
      drafts: { q: "granite", bbox: undefined },
    });
  });

  it("should keep the text engine primary when its query was cleared", () => {
    expect(
      composeSeedFromParams({ q: "", bbox: "-10,40,10,50", page: 1 }),
    ).toEqual({
      active: ["text", "location"],
      drafts: { q: "", bbox: "-10,40,10,50" },
    });
  });

  it("should seed the map with a box crossing the antimeridian", () => {
    expect(
      composeSeedFromParams({ q: "granite", bbox: "170,0,-170,20", page: 1 }),
    ).toEqual({
      active: ["text", "location"],
      drafts: { q: "granite", bbox: "170,0,-170,20" },
    });
  });

  it.each(["-10,200,10,50", "-10,50,10,40", "nope"])(
    "should never seed the map with the malformed box %s",
    (bbox) => {
      expect(composeSeedFromParams({ q: "granite", bbox, page: 1 })).toEqual({
        active: ["text", "location"],
        drafts: { q: "granite", bbox: undefined },
      });
    },
  );
});
