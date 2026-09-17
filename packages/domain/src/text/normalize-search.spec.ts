import { normalizeSearch } from "./normalize-search.ts";

describe("normalizeSearch", () => {
  it.each([
    ["Grès Métamorphique", "gres metamorphique"],
    ["basalte", "basalte"],
    ["", ""],
  ])("should fold %j into %j", (input, expected) => {
    expect(normalizeSearch(input)).toBe(expected);
  });
});
