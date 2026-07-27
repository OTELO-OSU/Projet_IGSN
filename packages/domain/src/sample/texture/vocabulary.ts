import { z } from "zod";

// Igneous texture: a flat controlled vocabulary shown alongside the material
// classification once an igneous branch (plutonic/volcanic) is chosen. It is NOT
// part of the material tree (a separate sample field); the valid set depends on
// the branch, and `porphyritic` is shared by both. See the igneous screenshot.
//
// The stored value is any of the union (porphyritic listed once).
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

// Paths under which each texture set applies. The plutonic/volcanic branch
// lives under `igneous` and is reused under metamorphic `meta_igneous_rock`, so
// each branch has two paths.
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

// The textures valid for a material path: the branch's set, or none unless the
// path is under a plutonic/volcanic branch.
export function texturesFor(material: string | null): readonly Texture[] {
  if (!material) return [];
  return (
    TEXTURE_BRANCHES.find(
      (b) => material === b.path || material.startsWith(`${b.path}.`),
    )?.textures ?? []
  );
}
