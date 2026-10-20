import { describe, expect, it } from "vitest";

import { importIssueLabel } from "./import-issue-label.ts";

describe("importIssueLabel", () => {
  it("should read the form's sentence for a coded issue", () => {
    expect(
      importIssueLabel({
        sheet: "Samples",
        row: 3,
        code: "collection_date_order",
        message: "start must be less than or equal to end",
      }),
    ).toBe("Start date must not be after end date.");
  });
});
