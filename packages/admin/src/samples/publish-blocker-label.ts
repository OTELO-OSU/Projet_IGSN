import type { PublishBlocker } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { m } from "#/paraglide/messages.js";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

const PUBLISH_BLOCKER_LABELS: Record<PublishBlocker, () => string> = {
  nature_missing: m.publish_blocked_nature_missing,
  type_missing: m.publish_blocked_type_missing,
  type_incomplete: m.publish_blocked_type_incomplete,
  material_missing: m.publish_blocked_material_missing,
  material_incomplete: m.publish_blocked_material_incomplete,
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
  collector_name_missing: m.publish_blocked_collector_name_missing,
  collection_curator_missing: m.publish_blocked_collection_curator_missing,
  collection_origin_missing: m.publish_blocked_collection_origin_missing,
  synthetic_starting_material_missing:
    m.publish_blocked_synthetic_starting_material_missing,
  synthetic_starting_material_composition_missing:
    m.publish_blocked_synthetic_starting_material_composition_missing,
  synthetic_final_product_missing:
    m.publish_blocked_synthetic_final_product_missing,
  synthetic_synthesis_date_missing:
    m.publish_blocked_synthetic_synthesis_date_missing,
  synthetic_operator_name_missing:
    m.publish_blocked_synthetic_operator_name_missing,
  relation_resource_type_missing:
    m.publish_blocked_relation_resource_type_missing,
  attachment_metadata_missing: m.publish_blocked_attachment_metadata_missing,
  attachment_limit_exceeded: () =>
    m.publish_blocked_attachment_limit_exceeded({ limit: UPLOAD_LIMIT }),
  user_not_verified: m.publish_blocked_user_not_verified,
};

export function publishBlockerLabel(blocker: PublishBlocker): string {
  return PUBLISH_BLOCKER_LABELS[blocker]();
}
