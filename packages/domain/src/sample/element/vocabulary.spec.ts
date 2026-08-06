import { describe, expect, it } from "vitest";

import { elementSchema } from "./vocabulary.ts";

describe("elementSchema", () => {
  it("should accept an ore element symbol", () => {
    expect(elementSchema.parse("fe")).toBe("fe");
  });

  it.each(["h", "o"])(
    "should reject %s, a non-ore element the vocabulary excludes",
    (symbol) => {
      expect(elementSchema.safeParse(symbol).success).toBe(false);
    },
  );
});
