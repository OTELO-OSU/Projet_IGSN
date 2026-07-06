import { natureLabel } from "./nature-label.ts";

describe("natureLabel", () => {
  it.each([
    ["hand_sample", "Hand sample"],
    ["inapplicable", "Inapplicable"],
    ["multiple_sample", "Multiple sample"],
    ["polished_section", "Polished section"],
    ["residue", "Residue"],
    ["rock_chips", "Rock chips"],
    ["rock_powder", "Rock powder"],
    ["sample_fragment", "Sample fragment"],
    ["sem_mount", "SEM Mount"],
    ["separated_materials", "Separated Materials"],
    ["thick_section", "Thick section"],
    ["thin_section", "Thin section"],
  ] as const)("should return the translated label for %s", (nature, label) => {
    expect(natureLabel(nature)).toBe(label);
  });
});
