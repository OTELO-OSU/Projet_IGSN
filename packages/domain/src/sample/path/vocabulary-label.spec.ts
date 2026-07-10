import { describe, expect, it } from "vitest";

import { vocabularyLabel } from "./vocabulary-label.ts";

describe("vocabularyLabel", () => {
  const label = vocabularyLabel((path) => `material_${path}`, {
    material_rock: () => "Rock",
  });

  it("should resolve the node's message through its key", () => {
    expect(label("rock")).toBe("Rock");
  });

  it("should fall back to the key when the message is missing", () => {
    expect(label("lava")).toBe("material_lava");
  });
});
