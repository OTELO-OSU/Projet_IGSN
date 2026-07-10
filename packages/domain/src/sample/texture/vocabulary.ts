import { z } from "zod";

// Igneous texture: a flat controlled vocabulary shown alongside the material
// classification once an igneous branch (plutonic/volcanic) is chosen. It is NOT
// part of the material tree (a separate sample field); the valid set depends on
// the branch, and `porphyritic` is shared by both. See the igneous screenshot.
//
// The stored value is any of the union (porphyritic listed once).
const TEXTURES = [
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

// The textures valid for a material path: the branch's set, or none unless the
// path is under the igneous plutonic/volcanic branch.
export function texturesFor(material: string | null): readonly Texture[] {
  if (!material) return [];
  const segments = material.split(".");
  const igneous = segments.indexOf("igneous");
  if (igneous === -1) return [];
  const branch = segments[igneous + 1];
  if (branch === "plutonic") return PLUTONIC_TEXTURES;
  if (branch === "volcanic") return VOLCANIC_TEXTURES;
  return [];
}
