import { describe, expect, it } from "vitest";

import { parseInternalId } from "./parse-internal-id.ts";

describe("parseInternalId", () => {
  it.each([
    ["sample-12", 12],
    ["SAMPLE-12", undefined],
    [" sample-12 ", 12],
    ["12", undefined],
    ["sample-", undefined],
    ["sample-0", undefined],
    ["abc", undefined],
  ])("should parse %j as %j", (text, expected) => {
    expect(parseInternalId(text)).toBe(expected);
  });
});
