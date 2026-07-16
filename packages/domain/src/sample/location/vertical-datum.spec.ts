import { describe, expect, it } from "vitest";

import { verticalDatumSchema } from "./vertical-datum.ts";

describe("verticalDatumSchema", () => {
  it.each(["msl", "wgs84", "grs80"])(
    "should accept the known datum %s",
    (code) => {
      expect(verticalDatumSchema.parse(code)).toBe(code);
    },
  );

  it.each(["", "MSL", "wgs", "egm96"])(
    "should reject the unknown datum %s",
    (code) => {
      expect(verticalDatumSchema.safeParse(code).success).toBe(false);
    },
  );
});
