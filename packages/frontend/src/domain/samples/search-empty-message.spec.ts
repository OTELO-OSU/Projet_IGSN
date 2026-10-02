import { searchEmptyMessage } from "#/domain/samples/search-empty-message.ts";

const TOO_SHORT = "Type a word of at least 2 characters to search.";
const NO_RESULTS = "No samples match your search.";
const NO_LOCATED = "No published samples in the selected area.";
const BBOX = "0,0,1,1";

describe("searchEmptyMessage", () => {
  it.each([
    [{ search: "a" }, TOO_SHORT],
    [{ search: "a b" }, TOO_SHORT],
    [{ search: "*" }, TOO_SHORT],
    [{ search: "ab" }, NO_RESULTS],
    [{ search: "a basalt" }, NO_RESULTS],
    [{ search: "ab", bbox: BBOX }, NO_RESULTS],
    [{ bbox: BBOX }, NO_LOCATED],
  ])("should explain %j", (filters, expected) => {
    expect(searchEmptyMessage(filters)).toBe(expected);
  });
});
