import { describe, expect, it } from "vitest";

import { formatInternalId } from "./format-internal-id.ts";

describe("formatInternalId", () => {
  it("should prefix the internal number with sample-", () => {
    expect(formatInternalId(42)).toBe("sample-42");
  });
});
