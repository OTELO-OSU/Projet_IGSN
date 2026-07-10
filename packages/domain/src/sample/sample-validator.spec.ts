import { DEFAULT_PAGE_SIZE, listSamplesQuerySchema } from "./sample-validator";

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

  it.each(["", "   ", 42])(
    "should drop a blank or non-string search %j",
    (search) => {
      expect(listSamplesQuerySchema.parse({ search }).search).toBeUndefined();
    },
  );
});
