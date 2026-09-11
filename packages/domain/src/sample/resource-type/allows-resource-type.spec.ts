import { describe, expect, it } from "vitest";

import { allowsResourceType } from "./allows-resource-type.ts";

describe("allowsResourceType", () => {
  it.each([
    "rock_and_sediment.rock.igneous",
    "rock_and_sediment.rock.metamorphic",
    "rock_and_sediment.rock.sedimentary",
    "rock_and_sediment.rock.hydrothermal",
    "rock_and_sediment.sediment",
    "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
  ])("should allow a resource type on %s", (material) => {
    expect(allowsResourceType(material)).toBe(true);
  });

  it.each([
    "rock_and_sediment.rock",
    "rock_and_sediment.rock.xenolithic_rock",
    "rock_and_sediment.mineral",
    null,
  ])("should not allow a resource type on %s", (material) => {
    expect(allowsResourceType(material)).toBe(false);
  });
});
