import { collectionMethodLabelKey } from "@projet-igsn/domain/sample/collection-method/label";
import { materialLabelKey } from "@projet-igsn/domain/sample/material/label";
import { vocabularyLabel } from "@projet-igsn/domain/sample/path/vocabulary-label";
import { sampleTypeLabelKey } from "@projet-igsn/domain/sample/type/label";

import { m } from "#/paraglide/messages.js";

// The domain resolver bound to this app's paraglide catalog. The spec asserts
// every tree key resolves, so the dynamic lookup never falls back.
const messages = m as unknown as Record<string, (() => string) | undefined>;

export const materialPathLabel = vocabularyLabel(materialLabelKey, messages);
export const typeLabel = vocabularyLabel(sampleTypeLabelKey, messages);
export const collectionMethodLabel = vocabularyLabel(
  collectionMethodLabelKey,
  messages,
);
