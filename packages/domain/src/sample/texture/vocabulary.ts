import { z } from "zod";

import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

// It is NOT part of the material tree (a separate sample field); the valid set
// depends on the branch, and `porphyritic` is shared by both.
export const TEXTURES = [
  "phaneritic",
  "porphyritic",
  "pegmatitic",
  "aplitic",
  "cumulate",
  "poikilitic",
  "myrmekitic",
  "rapakivi",
  "orbicular",
  "cataclastic",
  "glassy",
  "aphanitic",
  "microlitic",
  "vesicular",
  "pyroclastic",
  "hyaloclastic",
] as const;

export const textureSchema = z.enum(TEXTURES);

export type Texture = z.infer<typeof textureSchema>;

export const PLUTONIC_TEXTURES = [
  "phaneritic",
  "porphyritic",
  "pegmatitic",
  "aplitic",
  "cumulate",
  "poikilitic",
  "myrmekitic",
  "rapakivi",
  "orbicular",
  "cataclastic",
] as const satisfies readonly Texture[];

export const VOLCANIC_TEXTURES = [
  "glassy",
  "aphanitic",
  "microlitic",
  "porphyritic",
  "vesicular",
  "pyroclastic",
  "hyaloclastic",
] as const satisfies readonly Texture[];

// The plutonic/volcanic branch lives under `igneous` and is reused under
// metamorphic `meta_igneous_rock`, so each branch has two paths.
const TEXTURE_BRANCHES = [
  { path: "rock.igneous.plutonic", textures: PLUTONIC_TEXTURES },
  { path: "rock.igneous.volcanic", textures: VOLCANIC_TEXTURES },
  {
    path: "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic",
    textures: PLUTONIC_TEXTURES,
  },
  {
    path: "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.volcanic",
    textures: VOLCANIC_TEXTURES,
  },
];

export function texturesFor(material: string | null): readonly Texture[] {
  if (!material) return [];
  return (
    TEXTURE_BRANCHES.find((b) => isPathAtOrUnder(material, b.path))?.textures ??
    []
  );
}
