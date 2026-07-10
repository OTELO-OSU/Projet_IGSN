import { metamorphicFaciesLabelKey } from "@projet-igsn/domain/sample/metamorphic-facies/label";
import { type MetamorphicFacies } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";

import { m } from "#/paraglide/messages.js";

// Label a metamorphic facies code by its own name. The domain-owned message key
// resolves against this app's paraglide runtime; the spec asserts every key exists.
const messages = m as unknown as Record<string, (() => string) | undefined>;

export function metamorphicFaciesLabel(facies: MetamorphicFacies): string {
  return messages[metamorphicFaciesLabelKey(facies)]?.() ?? facies;
}
