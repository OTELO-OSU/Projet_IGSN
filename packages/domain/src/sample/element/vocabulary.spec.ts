import { describe, expect, it } from "vitest";

import { elementSchema } from "./vocabulary.ts";

describe("elementSchema", () => {
  it.each(["li", "fe", "au", "u", "lv"])("should accept %s", (symbol) => {
    expect(elementSchema.safeParse(symbol).success).toBe(true);
  });

  it.each([
    "",
    "h", // excluded non-ore element
    "o", // excluded non-ore element
    "Fe", // uppercase
    "gold", // name, not symbol
    "xx",
  ])("should reject %s", (input) => {
    expect(elementSchema.safeParse(input).success).toBe(false);
  });
});
