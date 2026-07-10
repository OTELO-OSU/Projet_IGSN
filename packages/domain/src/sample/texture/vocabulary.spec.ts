import { describe, expect, it } from "vitest";

import {
  PLUTONIC_TEXTURES,
  VOLCANIC_TEXTURES,
  texturesFor,
  textureSchema,
} from "./vocabulary.ts";

describe("textureSchema", () => {
  it.each(["phaneritic", "porphyritic", "glassy", "hyaloclastic"])(
    "should accept the known texture %s",
    (code) => {
      expect(textureSchema.parse(code)).toBe(code);
    },
  );

  it.each(["", "unknown", "Phaneritic", "granite"])(
    "should reject the unknown texture %s",
    (code) => {
      expect(textureSchema.safeParse(code).success).toBe(false);
    },
  );
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

  it("should share porphyritic between both branches", () => {
    expect(PLUTONIC_TEXTURES).toContain("porphyritic");
    expect(VOLCANIC_TEXTURES).toContain("porphyritic");
  });
});
