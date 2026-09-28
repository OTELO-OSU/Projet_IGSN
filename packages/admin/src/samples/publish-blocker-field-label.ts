import type { PublishBlocker } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { m } from "#/paraglide/messages.js";
import { publishBlockerLabel } from "#/samples/publish-blocker-label.ts";
import {
  PUBLISH_BLOCKER_TAB,
  SAMPLE_FORM_TABS,
} from "#/samples/sample-form-tabs.ts";

const PUBLISH_BLOCKER_FIELD_LABELS: Record<
  PublishBlocker,
  (() => string) | null
> = {
  nature_missing: m.field_nature,
  type_missing: m.field_type,
  type_incomplete: m.field_type,
  material_missing: m.field_material,
  material_incomplete: m.field_material,
  location_position_missing: m.publish_field_location_position,
  collection_date_missing: m.field_collection_dates,
  numeric_age_unit_missing: m.field_numeric_unit,
  numeric_age_reference_missing: m.field_numeric_years_unit,
  numeric_age_range_incomplete: m.field_numeric_age,
  geological_age_range_incomplete: m.field_geological_age,
  vertical_position_incomplete: m.field_vertical_position,
  existence_status_missing: m.field_existence_status,
  availability_status_missing: m.field_availability_status,
  scientific_context_missing: m.field_provenance_status,
  collector_firstname_missing: m.publish_field_collector_firstname,
  collector_lastname_missing: m.publish_field_collector_lastname,
  chief_scientist_firstname_missing: m.publish_field_chief_scientist_firstname,
  chief_scientist_lastname_missing: m.publish_field_chief_scientist_lastname,
  additional_role_firstname_missing: m.publish_field_additional_role_firstname,
  additional_role_lastname_missing: m.publish_field_additional_role_lastname,
  collection_origin_missing: m.field_collection_origin,
  synthetic_starting_material_missing: m.field_starting_material,
  synthetic_starting_material_composition_missing:
    m.field_starting_material_composition,
  synthetic_final_product_missing: m.field_final_product,
  synthetic_synthesis_date_missing: m.field_synthesis_dates,
  synthetic_operator_firstname_missing: m.publish_field_operator_firstname,
  synthetic_operator_lastname_missing: m.publish_field_operator_lastname,
  relation_resource_type_missing: m.publish_field_relation_resource_type,
  process_step_date_missing: m.field_process_step_dates,
  attachment_metadata_missing: m.publish_field_attachment_resource_type,
  parent_not_found: null,
  attachment_limit_exceeded: null,
  user_not_verified: null,
};

const tabOrder = (blocker: PublishBlocker): number => {
  const index = SAMPLE_FORM_TABS.findIndex(
    ({ value }) => value === PUBLISH_BLOCKER_TAB[blocker],
  );
  return index === -1 ? SAMPLE_FORM_TABS.length : index;
};

const blockerLine = (blocker: PublishBlocker): string => {
  const tab = SAMPLE_FORM_TABS.find(
    ({ value }) => value === PUBLISH_BLOCKER_TAB[blocker],
  );
  const fieldLabel = PUBLISH_BLOCKER_FIELD_LABELS[blocker];
  return tab && fieldLabel
    ? `${tab.label()} > ${fieldLabel()}`
    : publishBlockerLabel(blocker);
};

export function publishBlockerLines(
  blockers: readonly PublishBlocker[],
): { blocker: PublishBlocker; line: string }[] {
  return blockers
    .toSorted((a, b) => tabOrder(a) - tabOrder(b))
    .map((blocker) => ({ blocker, line: blockerLine(blocker) }));
}
