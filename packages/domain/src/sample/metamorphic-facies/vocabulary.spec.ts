import { describe, expect, it } from "vitest";

import {
  METAMORPHIC_FACIES,
  faciesFor,
  metamorphicFaciesSchema,
} from "./vocabulary.ts";

describe("metamorphicFaciesSchema", () => {
  it.each(["zeolite", "greenschist", "hornfels_contact", "impactite"])(
    "should accept the known facies %s",
    (code) => {
      expect(metamorphicFaciesSchema.parse(code)).toBe(code);
    },
  );

  it.each(["", "unknown", "Zeolite", "gneiss"])(
    "should reject the unknown facies %s",
    (code) => {
      expect(metamorphicFaciesSchema.safeParse(code).success).toBe(false);
    },
  );
});

describe("faciesFor", () => {
  it("should return every facies for a metamorphic material path", () => {
    expect(faciesFor("rock.metamorphic.strongly_metamorphosed.gneiss")).toEqual(
      METAMORPHIC_FACIES,
    );
  });

  it("should return the facies as soon as metamorphic is chosen", () => {
    expect(faciesFor("rock.metamorphic")).toEqual(METAMORPHIC_FACIES);
  });

  it.each([null, "rock.igneous.plutonic.felsic.granite", "rock", "mineral"])(
    "should return no facies for non-metamorphic material %s",
    (material) => {
      expect(faciesFor(material)).toEqual([]);
    },
  );
});
