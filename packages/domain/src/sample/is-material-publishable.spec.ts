import { describe, expect, it } from "vitest";

import { isMaterialPublishable } from "./is-material-publishable.ts";

describe("isMaterialPublishable", () => {
  it.each(["rock", "rock.igneous", "sediment", "mineral", "fossil"])(
    "should allow a leaf/path under an in-scope type %s",
    (path) => {
      expect(isMaterialPublishable(path as never)).toBe(true);
    },
  );

  it.each(["synthetic_rock_mineral", "extraterrestrial_rock"])(
    "should reject a path whose root type is not publishable: %s",
    (path) => {
      expect(isMaterialPublishable(path as never)).toBe(false);
    },
  );
});
