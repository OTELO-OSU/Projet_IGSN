import { m } from "#/paraglide/messages.js";

describe("location search messages", () => {
  it.each([
    [m.search_engine_text, "Text"],
    [m.search_engine_location, "Location"],
    [m.search_map_label, "Search area map"],
    [
      m.search_map_hint,
      "Click Draw an area, then click two opposite corners on the map.",
    ],
    [m.search_map_draw, "Draw an area"],
    [m.search_map_draw_hint, "Or hold Shift and drag on the map."],
    [m.search_add_engine_text, "Add text search"],
    [m.search_add_engine_location, "Add location"],
    [() => m.search_remove_engine({ engine: "Location" }), "Remove Location"],
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
