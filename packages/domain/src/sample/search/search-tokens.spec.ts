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

  it.each(["a", "*a*", "😀", "á", "́́", "\u0301e"])(
    "should drop the token %j, shorter than 2 characters without its wildcards",
    (token) => {
      expect(searchTokens(`${token} basalt`)).toEqual(["basalt"]);
    },
  );

  it.each(["ab", "a*b", "ab́", "😀😀"])(
    "should keep the 2-character token %j",
    (token) => {
      expect(searchTokens(token)).toEqual([token]);
    },
  );

  it("should collapse the duplicate tokens", () => {
    expect(searchTokens("basalt core basalt")).toEqual(["basalt", "core"]);
  });

  it("should keep only the first 6 tokens", () => {
    expect(searchTokens("aa bb aa cc dd ee ff gg")).toEqual([
      "aa",
      "bb",
      "cc",
      "dd",
      "ee",
      "ff",
    ]);
  });
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
    const { segments } = parseSearchToken("a*a*a*a*a*a*a*a*z");

    expect(segments).toHaveLength(MAX_WILDCARDS + 1);
    expect(segments.at(-1)).toBe("a*a*a*a*a*a*z");
  });
});
