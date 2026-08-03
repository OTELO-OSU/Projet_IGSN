import { searchEmptyMessage } from "./search-empty-message.ts";

describe("searchEmptyMessage", () => {
  it("should blame the area when only a box narrows the search", () => {
    expect(searchEmptyMessage({ bbox: "1,2,3,4" })).toBe(
      "No published samples in the selected area.",
    );
  });

  it.each([
    ["a text query alone", { search: "basalt" }],
    ["a text query and a box", { search: "basalt", bbox: "1,2,3,4" }],
    ["neither", {}],
  ])("should report no match on %s", (_case, params) => {
    expect(searchEmptyMessage(params)).toBe("No samples match your search.");
  });
});
