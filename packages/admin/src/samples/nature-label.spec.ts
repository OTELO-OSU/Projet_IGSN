import { vi } from "vitest";

// The real paraglide `m` has no `nature_*` code keys yet, so mock it to control
// which labels exist and exercise both the hit and the fallback branch.
vi.mock("#/paraglide/messages.js", () => ({
  m: {
    nature_thin_section: () => "Thin section",
    nature_rock_powder: () => "Rock powder",
  },
}));

import { natureLabel } from "./nature-label.ts";

describe("natureLabel", () => {
  it.each([
    ["thin_section", "Thin section"],
    ["rock_powder", "Rock powder"],
  ] as const)("should return the translated label for %s", (nature, label) => {
    expect(natureLabel(nature)).toBe(label);
  });

  it("should fall back to a marked code when no translation exists", () => {
    expect(natureLabel("hand_sample")).toBe("##__hand_sample__##");
  });
});
