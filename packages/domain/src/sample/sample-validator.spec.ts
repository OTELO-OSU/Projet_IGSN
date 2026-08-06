import {
  DEFAULT_PAGE_SIZE,
  listSamplesQuerySchema,
  pageSizeSchema,
} from "./sample-validator";

describe("pageSizeSchema", () => {
  it("should default to the given fallback when absent", () => {
    expect(pageSizeSchema(50).parse(undefined)).toBe(50);
  });

  it.each([10, 25, 50])("should accept preset %s", (size) => {
    expect(pageSizeSchema(50).parse(size)).toBe(size);
  });

  it.each(["7", "999", "abc", 0, -5])(
    "should fall back to the given default for off-preset %s",
    (size) => {
      expect(pageSizeSchema(50).parse(size)).toBe(50);
    },
  );
});

describe("listSamplesQuerySchema", () => {
  it("should default page and perPage when absent", () => {
    expect(listSamplesQuerySchema.parse({})).toEqual({
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
    });
  });

  it.each([10, 25, 50])("should accept preset perPage %s", (perPage) => {
    expect(listSamplesQuerySchema.parse({ perPage }).perPage).toBe(perPage);
  });

  it.each(["7", "999", "abc", 0, -5])(
    "should fall back to the default perPage for off-preset %s",
    (perPage) => {
      expect(listSamplesQuerySchema.parse({ perPage }).perPage).toBe(
        DEFAULT_PAGE_SIZE,
      );
    },
  );

  it("should coerce a numeric page string", () => {
    expect(listSamplesQuerySchema.parse({ page: "3" }).page).toBe(3);
  });

  it.each(["abc", 0, -5, 1.5])(
    "should fall back to page 1 for invalid %s",
    (page) => {
      expect(listSamplesQuerySchema.parse({ page }).page).toBe(1);
    },
  );

  it.each(["asc", "desc"] as const)(
    "should accept sorting by status %s",
    (order) => {
      expect(listSamplesQuerySchema.parse({ sort: "status", order })).toEqual({
        page: 1,
        perPage: DEFAULT_PAGE_SIZE,
        sort: "status",
        order,
      });
    },
  );

  it("should leave the order optional (consumers default to asc)", () => {
    expect(
      listSamplesQuerySchema.parse({ sort: "status" }).order,
    ).toBeUndefined();
  });

  it("should drop an unknown sort", () => {
    expect(listSamplesQuerySchema.parse({ sort: "name" }).sort).toBeUndefined();
  });

  it("should drop an unknown order", () => {
    const result = listSamplesQuerySchema.parse({
      sort: "status",
      order: "sideways",
    });
    expect(result.sort).toBe("status");
    expect(result.order).toBeUndefined();
  });

  it("should accept and trim a search term", () => {
    expect(listSamplesQuerySchema.parse({ search: "  gres " }).search).toBe(
      "gres",
    );
  });

  it.each(["", "   "])(
    "should keep the blank search %j, which matches no sample",
    (search) => {
      expect(listSamplesQuerySchema.parse({ search }).search).toBe("");
    },
  );

  it("should drop a non-string search", () => {
    expect(listSamplesQuerySchema.parse({ search: 42 }).search).toBeUndefined();
  });

  it("should accept a search of exactly 200 characters", () => {
    const search = "a".repeat(200);

    expect(listSamplesQuerySchema.parse({ search }).search).toBe(search);
  });

  it("should truncate a search longer than 200 characters", () => {
    expect(
      listSamplesQuerySchema.parse({ search: "a".repeat(201) }).search,
    ).toBe("a".repeat(200));
  });

  it("should pass through valid facet filters", () => {
    expect(
      listSamplesQuerySchema.parse({
        type: "core.section",
        material: "rock.igneous.plutonic",
        nature: "rock_powder",
        specificName: "Basalt",
        collectorName: "Marie Curie",
        ageMin: "10",
        ageMax: "100",
        ageUnit: "ma",
      }),
    ).toEqual({
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
      type: "core.section",
      material: "rock.igneous.plutonic",
      nature: "rock_powder",
      collectorName: "Marie Curie",
      ageMin: 10,
      ageMax: 100,
      ageUnit: "ma",
    });
  });

  it("should drop invalid facet values instead of rejecting", () => {
    const result = listSamplesQuerySchema.parse({
      type: "not.a.type",
      nature: "not_a_nature",
      ageUnit: "century",
    });
    expect(result).toEqual({ page: 1, perPage: DEFAULT_PAGE_SIZE });
  });

  it("should parse a valid bbox string into degrees", () => {
    expect(listSamplesQuerySchema.parse({ bbox: "-10,40,10,50" }).bbox).toEqual(
      {
        west: -10,
        south: 40,
        east: 10,
        north: 50,
      },
    );
  });

  it("should parse a bbox crossing the antimeridian", () => {
    expect(listSamplesQuerySchema.parse({ bbox: "10,40,-10,50" }).bbox).toEqual(
      {
        west: 10,
        south: 40,
        east: -10,
        north: 50,
      },
    );
  });

  it("should leave bbox undefined when absent", () => {
    expect(listSamplesQuerySchema.parse({}).bbox).toBeUndefined();
  });

  it.each([
    ["a latitude out of range", "-10,200,10,50"],
    ["a longitude out of range", "-200,40,10,50"],
    ["north below south", "-10,50,10,40"],
    ["too few parts", "-10,40,10"],
    ["a non-numeric part", "-10,40,x,50"],
    ["an empty string", ""],
  ])("should drop an invalid bbox: %s", (_reason, bbox) => {
    expect(listSamplesQuerySchema.parse({ bbox }).bbox).toBeUndefined();
  });

  it("should keep page/perPage/search alongside a bbox", () => {
    expect(
      listSamplesQuerySchema.parse({
        page: "2",
        search: " gres ",
        bbox: "-10,40,10,50",
      }),
    ).toEqual({
      page: 2,
      perPage: DEFAULT_PAGE_SIZE,
      search: "gres",
      bbox: { west: -10, south: 40, east: 10, north: 50 },
    });
  });
});
