import { collectionMethodLabelKey } from "@projet-igsn/domain/sample/collection-method/label";
import { type CollectionMethod } from "@projet-igsn/domain/sample/collection-method/vocabulary";

import { m } from "#/paraglide/messages.js";

// Resolve a collection-method node's message key (domain-owned mapping) against
// this app's paraglide runtime. Every key is asserted to exist by the spec, so
// the dynamic lookup never falls back.
const messages = m as unknown as Record<string, (() => string) | undefined>;

export function collectionMethodLabel(method: CollectionMethod): string {
  const key = collectionMethodLabelKey(method);
  return messages[key]?.() ?? key;
}
