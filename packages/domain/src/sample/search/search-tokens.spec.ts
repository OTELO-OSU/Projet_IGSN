import {
  MAX_WILDCARDS,
  parseSearchToken,
  searchTokens,
} from "./search-tokens.ts";

describe("searchTokens", () => {
  it("should split a search on whitespace", () => {
    expect(searchTokens(" carotte  de \n basalte ")).toEqual([
      "carotte",
      "de",
      "basalte",
    ]);
  });

  it.each(["   ", "*", "** *"])(
    "should return no token for the intentless search %j",
    (search) => {
      expect(searchTokens(search)).toEqual([]);
    },
  );
});

describe("parseSearchToken", () => {
  it.each([
    ["gres", ["gres"], false, false],
    ["a.b+c", ["a.b+c"], false, false],
    ["bas*", ["bas", ""], true, false],
    ["*te", ["", "te"], false, true],
    ["caro*te", ["caro", "te"], true, true],
    ["*", ["", ""], false, false],
    ["a.b*", ["a.b", ""], true, false],
  ])("should split %j into %j", (token, segments, anchorStart, anchorEnd) => {
    expect(parseSearchToken(token)).toEqual({
      segments,
      anchorStart,
      anchorEnd,
    });
  });

  it.each([
    ["**z", ["", "z"], false, true],
    ["a**b", ["a", "b"], true, true],
    ["**", ["", ""], false, false],
    ["a***b", ["a", "b"], true, true],
  ])(
    "should collapse the adjacent wildcards in %j",
    (token, segments, anchorStart, anchorEnd) => {
      // "\S*\S*" backtracks: 50 rows against a 200-character "**z..." query
      // measured 45s.
      expect(parseSearchToken(token)).toEqual({
        segments,
        anchorStart,
        anchorEnd,
      });
    },
  );

  it.each([
    ["*bas*alt*", ["", "bas", "alt", ""], false, false],
    ["*a*b*c*d*", ["", "a", "b", "c*d", ""], false, false],
  ])(
    "should not spend the cap on the outer wildcards of %j",
    (token, segments, anchorStart, anchorEnd) => {
      expect(parseSearchToken(token)).toEqual({
        segments,
        anchorStart,
        anchorEnd,
      });
    },
  );

  it("should cap the wildcards and keep the extras literal", () => {
    // Postgres runs a DFA, but the same split drives a JS RegExp, which
    // backtracks: uncapped, "a*a*a*a*a*a*a*a*z" freezes the tab for 100s.
    const { segments } = parseSearchToken("a*a*a*a*a*a*a*a*z");

    expect(segments).toHaveLength(MAX_WILDCARDS + 1);
    expect(segments.at(-1)).toBe("a*a*a*a*a*a*z");
  });
});
