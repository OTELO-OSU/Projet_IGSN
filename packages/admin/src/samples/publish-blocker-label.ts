import type { PublishBlocker } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { m } from "#/paraglide/messages.js";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

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
  vertical_position_incomplete: m.publish_blocked_vertical_position_incomplete,
  existence_status_missing: m.publish_blocked_existence_status_missing,
  availability_status_missing: m.publish_blocked_availability_status_missing,
  scientific_context_missing: m.publish_blocked_scientific_context_missing,
  funder_organizations_missing: m.publish_blocked_funder_organizations_missing,
  research_program_name_missing:
    m.publish_blocked_research_program_name_missing,
  chief_scientist_missing: m.publish_blocked_chief_scientist_missing,
  host_institution_missing: m.publish_blocked_host_institution_missing,
  collector_name_missing: m.publish_blocked_collector_name_missing,
  collection_curator_missing: m.publish_blocked_collection_curator_missing,
  collection_origin_missing: m.publish_blocked_collection_origin_missing,
  current_archive_missing: m.publish_blocked_current_archive_missing,
  synthetic_starting_material_nature_missing:
    m.publish_blocked_synthetic_starting_material_nature_missing,
  synthetic_starting_material_form_missing:
    m.publish_blocked_synthetic_starting_material_form_missing,
  synthetic_starting_material_composition_missing:
    m.publish_blocked_synthetic_starting_material_composition_missing,
  synthetic_final_product_missing:
    m.publish_blocked_synthetic_final_product_missing,
  synthetic_experiment_duration_missing:
    m.publish_blocked_synthetic_experiment_duration_missing,
  synthetic_synthesis_date_missing:
    m.publish_blocked_synthetic_synthesis_date_missing,
  synthetic_operator_name_missing:
    m.publish_blocked_synthetic_operator_name_missing,
  attachment_limit_exceeded: () =>
    m.publish_blocked_attachment_limit_exceeded({ limit: UPLOAD_LIMIT }),
  user_not_verified: m.publish_blocked_user_not_verified,
};

export function publishBlockerLabel(blocker: PublishBlocker): string {
  return PUBLISH_BLOCKER_LABELS[blocker]();
}
