import { describe, expect, it } from "vitest";

import { typeLabel } from "./type-label.ts";

describe("typeLabel", () => {
  it.each([
    ["core", "Core"],
    ["core.half_round", "Core Half round"],
    ["dredge", "Dredge"],
  ] as const)("should return the translated label for %s", (type, label) => {
    expect(typeLabel(type)).toBe(label);
  });
});
