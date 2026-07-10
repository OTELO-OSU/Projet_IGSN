import { matchRanges } from "./highlight-match.ts";

describe("matchRanges", () => {
  it("should return the offsets of the matched run", () => {
    expect(matchRanges("Basalt", "bas")).toEqual([[0, 3]]);
  });

  it("should match accent- and case-insensitively over the original offsets", () => {
    expect(matchRanges("Grès", "gres")).toEqual([[0, 4]]);
    expect(matchRanges("GRANITE", "gran")).toEqual([[0, 4]]);
  });

  it("should return every occurrence", () => {
    expect(matchRanges("abcabc", "abc")).toEqual([
      [0, 3],
      [3, 6],
    ]);
  });

  it("should return no ranges when the query is empty", () => {
    expect(matchRanges("Basalt", "")).toEqual([]);
  });

  it("should return no ranges when nothing matches", () => {
    expect(matchRanges("Basalt", "xyz")).toEqual([]);
  });
});
