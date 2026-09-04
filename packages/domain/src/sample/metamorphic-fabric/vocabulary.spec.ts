import { describe, expect, it } from "vitest";

import {
  METAMORPHIC_FABRICS,
  fabricsFor,
  metamorphicFabricSchema,
} from "./vocabulary.ts";

describe("metamorphicFabricSchema", () => {
  it("should accept a known fabric", () => {
    expect(metamorphicFabricSchema.parse("schistose")).toBe("schistose");
  });

  it("should reject an unknown fabric", () => {
    expect(metamorphicFabricSchema.safeParse("gneiss").success).toBe(false);
  });
});

describe("fabricsFor", () => {
  it("should return every fabric for a metamorphic material path", () => {
    expect(
      fabricsFor("rock.metamorphic.strongly_metamorphosed.gneiss"),
    ).toEqual(METAMORPHIC_FABRICS);
  });

  it("should return the fabrics as soon as metamorphic is chosen", () => {
    expect(fabricsFor("rock.metamorphic")).toEqual(METAMORPHIC_FABRICS);
  });

  it.each([null, "rock.igneous.plutonic.felsic.granite", "rock", "mineral"])(
    "should return no fabric for non-metamorphic material %s",
    (material) => {
      expect(fabricsFor(material)).toEqual([]);
    },
  );
});
