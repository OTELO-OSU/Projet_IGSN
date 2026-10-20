import type { SearchQuery, SearchTerm } from "./parse-search-query.ts";

import { parseSearchQuery, searchQueryTerms } from "./parse-search-query.ts";

const word = (token: string): SearchTerm => ({ kind: "word", token });
const phrase = (text: string): SearchTerm => ({ kind: "phrase", text });
const and = (...children: SearchQuery[]): SearchQuery => ({
  kind: "and",
  children,
});
const or = (...children: SearchQuery[]): SearchQuery => ({
  kind: "or",
  children,
});

describe("parseSearchQuery", () => {
  it.each<[string, SearchQuery]>([
    ["basalt powder", and(word("basalt"), word("powder"))],
    ["basalt OR granite", or(word("basalt"), word("granite"))],
    ["basalt AND granite", and(word("basalt"), word("granite"))],
    ["basalt ET granite", and(word("basalt"), word("granite"))],
    ["basalt OU granite", or(word("basalt"), word("granite"))],
    ["aa OU bb AND cc", or(word("aa"), and(word("bb"), word("cc")))],
    ["aa bb OR cc", or(and(word("aa"), word("bb")), word("cc"))],
    ["(aa OR bb) cc", and(or(word("aa"), word("bb")), word("cc"))],
    [
      "((aa OR bb) cc) OR dd",
      or(and(or(word("aa"), word("bb")), word("cc")), word("dd")),
    ],
    ['"basalt powder"', phrase("basalt powder")],
    ["'basalt powder'", phrase("basalt powder")],
    ['"  basalt \t powder "', phrase("basalt powder")],
    ["l'Étang", word("l'Étang")],
    ["d'Ornon 'basalt powder'", and(word("d'Ornon"), phrase("basalt powder"))],
    ['"basalt powder', and(word("basalt"), word("powder"))],
    ["'basalt powder", and(word("basalt"), word("powder"))],
    ['"a*b (OR) AND c"', phrase("a*b (OR) AND c")],
    ['"OR"', phrase("OR")],
    ['"or"', phrase("or")],
    ["'et'", phrase("et")],
    ["basalt OR", word("basalt")],
    ["AND basalt", word("basalt")],
    ["aa OR OR bb", or(word("aa"), word("bb"))],
    ["aa () bb", and(word("aa"), word("bb"))],
    ["aa ) bb", and(word("aa"), word("bb"))],
    ["(aa OR bb", or(word("aa"), word("bb"))],
    [
      'aa bb cc dd ee "ff gg" OR hh',
      and(
        word("aa"),
        word("bb"),
        word("cc"),
        word("dd"),
        word("ee"),
        phrase("ff gg"),
      ),
    ],
    ['a basalt é "b" *', word("basalt")],
  ])("should parse %j", (search, query) => {
    expect(parseSearchQuery(search)).toEqual(query);
  });

  it.each([
    ["basalt or granite", "basalt OR granite"],
    ["basalt Ou granite", "basalt OU granite"],
    ["rock and roll", "rock AND roll"],
    ["basalt eT granite", "basalt ET granite"],
    ["aa ou bb and cc", "aa OU bb AND cc"],
    ["or", "OR"],
    ["basalt or", "basalt OR"],
    ["or basalt", "OR basalt"],
    ["aa or Or bb", "aa OR OR bb"],
    ["aa bb cc dd ee oR ff", "aa bb cc dd ee OR ff"],
  ])("should parse %j like %j", (search, uppercase) => {
    expect(parseSearchQuery(search)).toEqual(parseSearchQuery(uppercase));
  });

  it.each(["", "   ", "()", "OR AND", 'a b "c" *'])(
    "should return undefined when no term of %j survives",
    (search) => {
      expect(parseSearchQuery(search)).toBeUndefined();
    },
  );
});

describe("searchQueryTerms", () => {
  it("should list the leaves in reading order", () => {
    const query = parseSearchQuery('(aa OR "bb cc") dd');

    expect(query && searchQueryTerms(query)).toEqual([
      word("aa"),
      phrase("bb cc"),
      word("dd"),
    ]);
  });
});
