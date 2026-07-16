import { describe, expect, it } from "vitest";

import { navigationTypeSchema } from "./navigation-type.ts";

describe("navigationTypeSchema", () => {
  it.each(["GPS", "DVL/LBL:Renav:Confirmed", "RTK GPS", "NotProvided"])(
    "should accept the known navigation type %s",
    (code) => {
      expect(navigationTypeSchema.parse(code)).toBe(code);
    },
  );

  it.each(["", "gps", "sonar", "GPS/Assumed"])(
    "should reject the unknown navigation type %s",
    (code) => {
      expect(navigationTypeSchema.safeParse(code).success).toBe(false);
    },
  );
});
