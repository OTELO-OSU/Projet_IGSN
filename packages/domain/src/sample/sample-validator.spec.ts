import {
  DEFAULT_PAGE_SIZE,
  listSamplesQuerySchema,
  pageSizeSchema,
  updateSampleBodySchema,
} from "./sample-validator";

describe("updateSampleBodySchema", () => {
  const body = {
    name: "Basalt 42",
    expectedUpdatedAt: "2026-07-02T10:00:00.000Z",
  };

  it("should accept an edit of a sample", () => {
    expect(updateSampleBodySchema.safeParse(body).success).toBe(true);
  });

  it("should reject an edit carrying parentIds, since parentage is set at creation", () => {
    expect(
      updateSampleBodySchema.safeParse({
        ...body,
        parentIds: ["11111111-1111-4111-8111-111111111111"],
      }).success,
    ).toBe(false);
  });
});

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

  it.each([
    [500, 500],
    [25, 100],
  ])("should keep %s only when the given sizes allow it", (size, expected) => {
    expect(pageSizeSchema(100, [100, 500]).parse(size)).toBe(expected);
  });
});

describe("listSamplesQuerySchema", () => {
  it("should default page and perPage when absent", () => {
    expect(listSamplesQuerySchema.parse({})).toEqual({
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
    });
  });

  it("should accept a preset perPage", () => {
    expect(listSamplesQuerySchema.parse({ perPage: 10 }).perPage).toBe(10);
  });

  it("should fall back to the default perPage for an off-preset one", () => {
    expect(listSamplesQuerySchema.parse({ perPage: 999 }).perPage).toBe(
      DEFAULT_PAGE_SIZE,
    );
  });

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

  it.each([
    "sort",
    "ownership",
    "existenceStatus",
    "availabilityStatus",
  ] as const)(
    "should drop an unknown %s instead of failing the parse",
    (param) => {
      expect(
        listSamplesQuerySchema.parse({ [param]: "bogus" })[param],
      ).toBeUndefined();
    },
  );

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

  it("should accept a search of exactly 128 characters", () => {
    const search = "a".repeat(128);

    expect(listSamplesQuerySchema.parse({ search }).search).toBe(search);
  });

  it("should truncate a search longer than 128 characters", () => {
    expect(
      listSamplesQuerySchema.parse({ search: "a".repeat(129) }).search,
    ).toBe("a".repeat(128));
  });

  it("should pass through valid facet filters", () => {
    expect(
      listSamplesQuerySchema.parse({
        type: "core.section",
        material: "rock_and_sediment.rock.igneous.plutonic",
        nature: "powder",
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
      material: "rock_and_sediment.rock.igneous.plutonic",
      nature: "powder",
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

  it.each([
    ["a country", "-5,42,8,51"],
    ["a dateline-crossing box", "170,-10,-170,10"],
    ["exactly a quarter of the world", "-90,0,90,90"],
  ])("should keep a bbox within a quarter of the world: %s", (_case, bbox) => {
    expect(listSamplesQuerySchema.parse({ bbox }).bbox).toBeDefined();
  });

  it.each([
    ["the whole world", "-180,-90,180,90"],
    ["a full-width northern band", "-180,0,180,40"],
    ["a wide dateline-crossing box", "0,-60,-10,60"],
  ])(
    "should drop a bbox larger than a quarter of the world: %s",
    (_case, bbox) => {
      expect(listSamplesQuerySchema.parse({ bbox }).bbox).toBeUndefined();
    },
  );

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
