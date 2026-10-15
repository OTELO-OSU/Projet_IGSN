import { describe, expect, it } from "vitest";

import { sampleMapDetailsQuerySchema } from "./model.ts";

const numbersUpTo = (count: number) =>
  Array.from({ length: count }, (_, index) => index + 1);

describe("sampleMapDetailsQuerySchema", () => {
  it.each([
    { numbers: "7", expected: [7] },
    { numbers: "3,1,2", expected: [3, 1, 2] },
    { numbers: numbersUpTo(500).join(","), expected: numbersUpTo(500) },
  ])("should parse $expected.length comma-separated numbers", (query) => {
    expect(sampleMapDetailsQuerySchema.parse(query)).toEqual({
      numbers: query.expected,
    });
  });

  it.each([
    { numbers: "" },
    { numbers: "0" },
    { numbers: "-1" },
    { numbers: "1.5" },
    { numbers: "1,abc" },
    { numbers: "1,,2" },
    { numbers: "99999999999" },
    { numbers: numbersUpTo(501).join(",") },
    {},
  ])("should reject %o", (query) => {
    expect(sampleMapDetailsQuerySchema.safeParse(query).success).toBe(false);
  });
});
