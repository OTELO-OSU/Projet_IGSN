import type { Nature } from "@projet-igsn/domain/sample/nature";

import { m } from "#/paraglide/messages.js";

// Typed map from nature code to its translation (.claude/rules/i18n.md, ADR
// 0005): adding a Nature without its `nature_*` message fails to compile here,
// instead of rendering a placeholder to users at runtime.
const NATURE_LABELS: Record<Nature, () => string> = {
  hand_sample: m.nature_hand_sample,
  inapplicable: m.nature_inapplicable,
  multiple_sample: m.nature_multiple_sample,
  polished_section: m.nature_polished_section,
  residue: m.nature_residue,
  rock_chips: m.nature_rock_chips,
  rock_powder: m.nature_rock_powder,
  sample_fragment: m.nature_sample_fragment,
  sem_mount: m.nature_sem_mount,
  separated_materials: m.nature_separated_materials,
  thick_section: m.nature_thick_section,
  thin_section: m.nature_thin_section,
};

export function natureLabel(nature: Nature): string {
  return NATURE_LABELS[nature]();
}
