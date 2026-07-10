import { textureLabelKey } from "@projet-igsn/domain/sample/texture/label";
import { type Texture } from "@projet-igsn/domain/sample/texture/vocabulary";

import { m } from "#/paraglide/messages.js";

// Label a texture code by its own name. The domain-owned message key resolves
// against this app's paraglide runtime; the spec asserts every key exists.
const messages = m as unknown as Record<string, (() => string) | undefined>;

export function textureLabel(texture: Texture): string {
  return messages[textureLabelKey(texture)]?.() ?? texture;
}
