import { describe, expect, it } from "vitest";

import { pathLabelKey } from "./label-key.ts";

describe("pathLabelKey", () => {
  it("should prefix a root segment", () => {
    expect(pathLabelKey("material", "rock")).toBe("material_rock");
  });

  it("should key by the deepest segment of a nested path", () => {
    expect(
      pathLabelKey("collection_method", "coring.gravity_corer.giant"),
    ).toBe("collection_method_giant");
  });
});
