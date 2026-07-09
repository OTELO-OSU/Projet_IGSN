import type { PublishBlocker } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { m } from "#/paraglide/messages.js";

// Typed map from publish-blocker code to its translation (i18n rule, ADR 0005):
// adding a PublishBlocker without its message fails to compile here, so the
// publish tooltip always explains every constraint.
const PUBLISH_BLOCKER_LABELS: Record<PublishBlocker, () => string> = {
  type_missing: m.publish_blocked_type_missing,
  type_incomplete: m.publish_blocked_type_incomplete,
  material_missing: m.publish_blocked_material_missing,
  material_incomplete: m.publish_blocked_material_incomplete,
};

export function publishBlockerLabel(blocker: PublishBlocker): string {
  return PUBLISH_BLOCKER_LABELS[blocker]();
}
