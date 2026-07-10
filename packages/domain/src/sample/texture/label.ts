import { pathLabelKey } from "../path/label-key.ts";
import { type Texture } from "./vocabulary.ts";

// The i18n message key for a texture code (shared by admin and frontend), e.g.
// `texture_phaneritic`. Each app resolves it against its own paraglide runtime.
export function textureLabelKey(texture: Texture): string {
  return pathLabelKey("texture", texture);
}
