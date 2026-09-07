import { m } from "#/paraglide/messages.js";

export const HIERARCHY_FIELD_LABELS = {
  stopLabel: m.hierarchy_stop_here(),
  removeLabel: (label: string) => m.hierarchy_remove_level({ label }),
  mustRefineText: m.hierarchy_must_refine(),
  canRefineText: m.hierarchy_can_refine(),
};
