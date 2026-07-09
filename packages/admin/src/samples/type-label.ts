import { sampleTypeLabelKey } from "@projet-igsn/domain/sample/type/label";
import { type SampleType } from "@projet-igsn/domain/sample/type/vocabulary";

import { m } from "#/paraglide/messages.js";

// Resolve a type node's message key (domain-owned mapping) against this app's
// paraglide runtime. Every key is asserted to exist by the spec, so the dynamic
// lookup never falls back.
const messages = m as unknown as Record<string, (() => string) | undefined>;

export function typeLabel(type: SampleType): string {
  const key = sampleTypeLabelKey(type);
  return messages[key]?.() ?? key;
}
