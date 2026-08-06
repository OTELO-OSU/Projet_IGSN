import { describe, expect, it } from "vitest";

import {
  PLUTONIC_TEXTURES,
  VOLCANIC_TEXTURES,
  texturesFor,
  textureSchema,
} from "./vocabulary.ts";

describe("textureSchema", () => {
  it("should accept a known texture", () => {
    expect(textureSchema.parse("phaneritic")).toBe("phaneritic");
  });

  it("should reject an unknown texture", () => {
    expect(textureSchema.safeParse("granite").success).toBe(false);
  });
});

describe("texturesFor", () => {
  it("should return the plutonic textures for a plutonic material path", () => {
    expect(texturesFor("rock.igneous.plutonic.felsic.granite")).toEqual(
      PLUTONIC_TEXTURES,
    );
  });

  it("should return the plutonic textures as soon as the plutonic branch is chosen", () => {
    expect(texturesFor("rock.igneous.plutonic")).toEqual(PLUTONIC_TEXTURES);
  });

  it("should return the volcanic textures for a volcanic material path", () => {
    expect(texturesFor("rock.igneous.volcanic.mafic.basalt")).toEqual(
      VOLCANIC_TEXTURES,
    );
  });

  it("should return the plutonic textures under the metamorphic meta_igneous_rock branch", () => {
    expect(
      texturesFor(
        "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite",
      ),
    ).toEqual(PLUTONIC_TEXTURES);
  });

  it("should return the volcanic textures under the metamorphic meta_igneous_rock branch", () => {
    expect(
      texturesFor(
        "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.volcanic.mafic.basalt",
      ),
    ).toEqual(VOLCANIC_TEXTURES);
  });

  it.each([null, "rock.igneous", "rock.sedimentary.microbialite", "mineral"])(
    "should return no textures for non-igneous-branch material %s",
    (material) => {
      expect(texturesFor(material)).toEqual([]);
    },
  );
});
