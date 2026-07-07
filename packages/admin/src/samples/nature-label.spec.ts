import { natureLabel } from "./nature-label.ts";

describe("natureLabel", () => {
  it.each([
    ["hand_sample", "Hand sample"],
    ["inapplicable", "Inapplicable"],
    ["multiple_sample", "Multiple sample"],
  ] as const)("should return the translated label for %s", (nature, label) => {
    expect(natureLabel(nature)).toBe(label);
  });
});
