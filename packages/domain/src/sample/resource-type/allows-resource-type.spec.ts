import { describe, expect, it } from "vitest";

import { allowsResourceType } from "./allows-resource-type.ts";

describe("allowsResourceType", () => {
  it.each([
    "rock.igneous",
    "rock.metamorphic",
    "rock.sedimentary",
    "rock.hydrothermal",
    "sediment",
    "rock.igneous.plutonic.felsic.granite",
  ])("should allow a resource type on %s", (material) => {
    expect(allowsResourceType(material)).toBe(true);
  });

  it.each(["rock", "rock.xenolithic_rock", "mineral", null])(
    "should not allow a resource type on %s",
    (material) => {
      expect(allowsResourceType(material)).toBe(false);
    },
  );
});
