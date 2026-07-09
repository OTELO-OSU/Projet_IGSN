import { type MaterialPath } from "@projet-igsn/domain/sample/material/classification";
import { materialLabelKey } from "@projet-igsn/domain/sample/material/label";

import { m } from "#/paraglide/messages.js";

// Label a material node by its own name (the UI joins ancestors into a
// breadcrumb). The node's message key (domain-owned mapping) resolves against
// this app's paraglide runtime. Every key is asserted to exist by the spec, so
// the dynamic lookup never falls back.
const messages = m as unknown as Record<string, (() => string) | undefined>;

export function materialPathLabel(path: MaterialPath): string {
  const key = materialLabelKey(path);
  return messages[key]?.() ?? key;
}
