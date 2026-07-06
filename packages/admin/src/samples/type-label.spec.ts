import { vi } from "vitest";

// Mock `m` to control which labels exist and exercise both the hit and the
// fallback branch, independent of the real message catalogue.
vi.mock("#/paraglide/messages.js", () => ({
  m: {
    type_core: () => "Core",
    type_core_half_round: () => "Half round",
  },
}));

import { typeLabel } from "./type-label.ts";

describe("typeLabel", () => {
  it.each([
    ["core", "Core"],
    ["core.half_round", "Half round"],
  ] as const)("should return the translated label for %s", (type, label) => {
    expect(typeLabel(type)).toBe(label);
  });

  it("should fall back to a marked code when no translation exists", () => {
    expect(typeLabel("dredge")).toBe("##__dredge__##");
  });
});
