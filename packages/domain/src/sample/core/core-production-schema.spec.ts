import { describe, expect, it } from "vitest";

import { coreProcessStepSchema } from "./core-production-schema.ts";

describe("coreProcessStepSchema", () => {
  it("should reject an hour precision timestamp without a time zone", () => {
    const result = coreProcessStepSchema.safeParse({
      stepType: "Synthesis",
      timestampStart: "2025-01-10T09:00",
      timestampEnd: "2025-01-12T17:30",
      timestampPrecision: "hour",
    });

    expect(result.error?.issues).toMatchObject([
      { path: ["timestampTimeZone"] },
    ]);
  });
});
