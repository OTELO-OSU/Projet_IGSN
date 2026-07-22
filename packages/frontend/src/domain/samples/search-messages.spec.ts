import { m } from "#/paraglide/messages.js";

// The location UI copy must resolve from the catalog: a missing key renders its
// raw name, so assert each message returns its localized English text.
describe("location search messages", () => {
  it.each([
    [m.search_engine_text, "Text"],
    [m.search_engine_location, "Location"],
    [m.search_map_label, "Search area map"],
    [
      m.search_map_hint,
      "Drag on the map to draw a rectangle, or type the bounds below, then search that area.",
    ],
    [
      m.search_location_empty_hint,
      "No published samples in the selected area.",
    ],
  ])("should resolve to its English text", (message, expected) => {
    expect(message()).toBe(expected);
  });

  it("should keep a Search action label", () => {
    expect(m.search_action()).toBe("Search");
  });
});
