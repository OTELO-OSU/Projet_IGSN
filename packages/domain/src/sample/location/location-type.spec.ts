import { describe, expect, it } from "vitest";

import { locationTypeSchema } from "./location-type.ts";

describe("locationTypeSchema", () => {
  it.each(["point", "area"])("should accept the known type %s", (code) => {
    expect(locationTypeSchema.parse(code)).toBe(code);
  });

  it.each(["", "Point", "line", "polygon"])(
    "should reject the unknown type %s",
    (code) => {
      expect(locationTypeSchema.safeParse(code).success).toBe(false);
    },
  );
});
