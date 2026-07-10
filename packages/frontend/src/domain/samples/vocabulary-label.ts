import { collectionMethodLabelKey } from "@projet-igsn/domain/sample/collection-method/label";
import { materialLabelKey } from "@projet-igsn/domain/sample/material/label";
import { sampleTypeLabelKey } from "@projet-igsn/domain/sample/type/label";

import { m } from "#/paraglide/messages.js";

// One resolver for all hierarchical vocabularies: the domain owns the key
// mapping, this app's paraglide runtime owns the text. The spec asserts every
// tree key resolves, so the dynamic lookup never falls back.
const messages = m as unknown as Record<string, (() => string) | undefined>;

function vocabularyLabel(
  labelKey: (path: string) => string,
): (path: string) => string {
  return (path) => {
    const key = labelKey(path);
    return messages[key]?.() ?? key;
  };
}

export const materialPathLabel = vocabularyLabel(materialLabelKey);
export const typeLabel = vocabularyLabel(sampleTypeLabelKey);
export const collectionMethodLabel = vocabularyLabel(collectionMethodLabelKey);
