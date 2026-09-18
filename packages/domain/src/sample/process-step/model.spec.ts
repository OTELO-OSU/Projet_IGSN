import { describe, expect, it } from "vitest";

import { sampleProcessStepSchema } from "./model.ts";

describe("sampleProcessStepSchema", () => {
  it("should accept a step carrying its kind alone, since date and description are optional", () => {
    expect(sampleProcessStepSchema.parse({ kind: "other" })).toEqual({
      kind: "other",
    });
  });

  it("should reject a step period ending before it starts", () => {
    const result = sampleProcessStepSchema.safeParse({
      kind: "preparation",
      date: { precision: "day", start: "2024-06-06", end: "2024-06-05" },
    });

    expect(result.error?.issues).toMatchObject([
      { params: { code: "process_date_order" } },
    ]);
  });
});
