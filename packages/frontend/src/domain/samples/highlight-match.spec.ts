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

  it.each(["basalt core", "core basalt"])(
    "should highlight every token of %j, in query order or not",
    (query) => {
      expect(matchRanges("Basalt Deep Core", query)).toEqual([
        [0, 6],
        [12, 16],
      ]);
    },
  );

  it("should highlight only the tokens that match", () => {
    expect(matchRanges("Basalt Deep Core", "basalt granite")).toEqual([[0, 6]]);
  });

  it("should expand a trailing wildcard to the end of the word", () => {
    expect(matchRanges("Basalt Core", "bas*")).toEqual([[0, 6]]);
  });

  it("should expand a leading wildcard to the start of the word", () => {
    expect(matchRanges("Carbonate Core", "*ate")).toEqual([[0, 9]]);
  });

  it("should anchor a wildcard token to word boundaries", () => {
    expect(matchRanges("Rebasalt", "bas*")).toEqual([]);
  });

  it.each(["*", "** *"])(
    "should highlight nothing for the intentless query %j",
    (query) => {
      // The API returns no sample for it either, so there is nothing to paint.
      expect(matchRanges("basalt core", query)).toEqual([]);
    },
  );

  it.each([
    ["(", "Core (deep)"],
    ["+", "Core +1"],
    ["|", "Core|A"],
    ["?", "Core?"],
    ["{", "Core {1}"],
    ["[", "Core [1]"],
    ["\\", "Core\\A"],
    // "^" is absent on purpose: it carries the Unicode Diacritic property, so
    // the accent-insensitive normalisation strips it from text and query alike.
    ["$", "Core$A"],
    // Inert here: NFD (unlike unaccent) never folds them. Kept to mirror the
    // API list.
    ["（", "Core（deep）"],
    ["＼", "Core＼A"],
  ])("should match the metacharacter %j literally", (query, text) => {
    expect(matchRanges(text, query)).toHaveLength(1);
    expect(matchRanges("Core deep", query)).toEqual([]);
  });

  it("should stay prompt on an adversarial wildcard query", () => {
    // Uncapped this backtracks for ~100s in a JS RegExp and freezes the tab.
    expect(matchRanges(`${"a".repeat(60)}b`, "a*a*a*a*a*a*a*a*z")).toEqual([]);
  });

  it("should stay prompt over a whole page of pathological tokens", () => {
    // A 200-character query over 50 rendered rows: 45s before adjacent
    // wildcards collapsed.
    const query = "**z ".repeat(50);
    const started = performance.now();

    for (let row = 0; row < 50; row++) {
      expect(matchRanges("a".repeat(320), query)).toEqual([]);
    }

    expect(performance.now() - started).toBeLessThan(5000);
  });

  it.each([
    ["bas*", "Basalt Core", [[0, 6]]],
    ["*powder", "Rock powder", [[5, 11]]],
    // A wildcard stays inside one word, so this matches "Carotte" only.
    ["caro*te", "Carotte de Basalte", [[0, 7]]],
    ["gres", "Gres du Nord", [[0, 4]]],
    ["**z", "Quartz", [[0, 6]]],
  ])("should be unchanged by the collapse for %j", (query, text, ranges) => {
    expect(matchRanges(text, query)).toEqual(ranges);
  });

  it("should stay prompt on a long name", () => {
    // The cap bounds the query, not the haystack, and sample names have no
    // length limit.
    const started = performance.now();

    expect(matchRanges("a".repeat(50_000), "**z")).toEqual([]);

    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("should highlight only within the matched prefix of a long name", () => {
    // Past the cap there is nothing to paint, which is the tradeoff.
    expect(matchRanges(`${"a ".repeat(200)}basalt`, "basalt")).toEqual([]);
    expect(matchRanges(`basalt ${"a ".repeat(200)}`, "basalt")).toEqual([
      [0, 6],
    ]);
  });

  it("should highlight a term wrapped in wildcards", () => {
    expect(matchRanges("Basaltique Core", "*bas*alt*")).toEqual([[0, 10]]);
  });

  it("should stay prompt on a page of unanchored wildcard tokens", () => {
    // Worst shape: no anchor, and "\S" makes a hyphenated name one long run.
    const query = "*a*z ".repeat(40);
    const started = performance.now();

    for (let row = 0; row < 100; row++) {
      expect(matchRanges("basalt-core-".repeat(25), query)).toEqual([]);
    }

    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("should return no range for a fuzzy-only match", () => {
    // The API matched fuzzily, but the mistyped text is not in the result.
    expect(matchRanges("Fontainebleau", "fontenebleau")).toEqual([]);
  });
});
