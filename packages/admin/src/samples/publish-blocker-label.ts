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
  metamorphic_facies_missing: m.publish_blocked_metamorphic_facies_missing,
  location_position_missing: m.publish_blocked_location_position_missing,
  collection_date_missing: m.publish_blocked_collection_date_missing,
  numeric_age_unit_missing: m.publish_blocked_numeric_age_unit_missing,
  numeric_age_reference_missing:
    m.publish_blocked_numeric_age_reference_missing,
  numeric_age_range_incomplete: m.publish_blocked_numeric_age_range_incomplete,
  geological_age_range_incomplete:
    m.publish_blocked_geological_age_range_incomplete,
  elevation_incomplete: m.publish_blocked_elevation_incomplete,
  availability_missing: m.publish_blocked_availability_missing,
  scientific_context_missing: m.publish_blocked_scientific_context_missing,
  funder_organization_missing: m.publish_blocked_funder_organization_missing,
  research_program_name_missing:
    m.publish_blocked_research_program_name_missing,
  research_program_chief_missing:
    m.publish_blocked_research_program_chief_missing,
  research_structure_missing: m.publish_blocked_research_structure_missing,
  collector_name_missing: m.publish_blocked_collector_name_missing,
  collection_curator_missing: m.publish_blocked_collection_curator_missing,
  collection_origin_missing: m.publish_blocked_collection_origin_missing,
};

export function publishBlockerLabel(blocker: PublishBlocker): string {
  return PUBLISH_BLOCKER_LABELS[blocker]();
}
