import type { SampleType } from "@projet-igsn/domain/sample/type";

import { m } from "#/paraglide/messages.js";

// Typed map from type path to its translation (.claude/rules/i18n.md): adding
// a SampleType without its `type_*` message fails to compile here, instead of
// rendering a placeholder to users at runtime.
const TYPE_LABELS: Record<SampleType, () => string> = {
  core: m.type_core,
  "core.half_round": m.type_core_half_round,
  "core.piece": m.type_core_piece,
  "core.quarter_round": m.type_core_quarter_round,
  "core.section": m.type_core_section,
  "core.section_half": m.type_core_section_half,
  "core.sub_piece": m.type_core_sub_piece,
  "core.whole_round": m.type_core_whole_round,
  "core.cuttings": m.type_core_cuttings,
  "core.individual_sample": m.type_core_individual_sample,
  "core.individual_sample_in_core": m.type_core_individual_sample_in_core,
  "core.sample_from_a_cut": m.type_core_sample_from_a_cut,
  "core.catcher": m.type_core_catcher,
  "core.slab": m.type_core_slab,
  "core.casq_section": m.type_core_casq_section,
  "core.casq_section_large_lu_gutter": m.type_core_casq_section_large_lu_gutter,
  "core.casq_section_narrow_nu_gutter":
    m.type_core_casq_section_narrow_nu_gutter,
  "core.outcrop_preserved_stratigraphy":
    m.type_core_outcrop_preserved_stratigraphy,
  dredge: m.type_dredge,
  individual_sample: m.type_individual_sample,
  serie_of_sample: m.type_serie_of_sample,
  inapplicable: m.type_inapplicable,
};

export function typeLabel(type: SampleType): string {
  return TYPE_LABELS[type]();
}
