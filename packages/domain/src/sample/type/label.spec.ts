import { describe, expect, it } from "vitest";

import { sampleTypeLabelKey } from "./label.ts";

describe("sampleTypeLabelKey", () => {
  it.each([
    ["core", "type_core"],
    ["core.half_round", "type_half_round"],
    ["dredge", "type_dredge"],
    ["individual_sample", "type_individual_sample"],
  ] as const)("should map %s to the message key %s", (type, key) => {
    expect(sampleTypeLabelKey(type)).toBe(key);
  });
});
