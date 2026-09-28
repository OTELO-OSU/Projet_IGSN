import type {
  PublishBlocker,
  PublishRequirement,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import type { LucideIcon } from "lucide-react";

import {
  ArchiveIcon,
  FingerprintIcon,
  GitForkIcon,
  HourglassIcon,
  LayersIcon,
  LinkIcon,
  MapPinIcon,
  MicroscopeIcon,
  RulerIcon,
  ShieldIcon,
} from "lucide-react";

import { m } from "#/paraglide/messages.js";

export const SAMPLE_FORM_TABS = [
  { value: "parent", label: m.tab_parent, icon: GitForkIcon },
  { value: "identity", label: m.tab_identity, icon: FingerprintIcon },
  {
    value: "classification",
    label: m.tab_sample_classification,
    icon: LayersIcon,
  },
  { value: "location", label: m.tab_location, icon: MapPinIcon },
  { value: "age", label: m.tab_age, icon: HourglassIcon },
  {
    value: "physical-description",
    label: m.tab_physical_description,
    icon: RulerIcon,
  },
  {
    value: "scientific-context",
    label: m.tab_scientific_context,
    icon: MicroscopeIcon,
  },
  {
    value: "conservation",
    label: m.tab_conservation_security,
    icon: ShieldIcon,
  },
  { value: "curation", label: m.tab_curation_repository, icon: ArchiveIcon },
  {
    value: "related-resources",
    label: m.tab_related_resources,
    icon: LinkIcon,
  },
] as const satisfies readonly {
  value: string;
  label: () => string;
  icon: LucideIcon;
}[];

export type SampleFormTab = (typeof SAMPLE_FORM_TABS)[number]["value"];

export const parentTabLabel = (count: number): string =>
  count > 1 ? m.tab_parents() : m.tab_parent();

export const PUBLISH_BLOCKER_TAB: Record<PublishBlocker, SampleFormTab | null> =
  {
    nature_missing: "identity",
    type_missing: "identity",
    type_incomplete: "identity",
    collection_date_missing: "identity",
    scientific_context_missing: "identity",
    process_step_date_missing: "identity",
    material_missing: "classification",
    material_incomplete: "classification",
    synthetic_starting_material_missing: "classification",
    synthetic_starting_material_composition_missing: "classification",
    synthetic_final_product_missing: "classification",
    synthetic_synthesis_date_missing: "classification",
    synthetic_operator_firstname_missing: "classification",
    synthetic_operator_lastname_missing: "classification",
    location_position_missing: "location",
    vertical_position_incomplete: "location",
    numeric_age_unit_missing: "age",
    numeric_age_reference_missing: "age",
    numeric_age_range_incomplete: "age",
    geological_age_range_incomplete: "age",
    collector_firstname_missing: "scientific-context",
    collector_lastname_missing: "scientific-context",
    chief_scientist_firstname_missing: "scientific-context",
    chief_scientist_lastname_missing: "scientific-context",
    additional_role_firstname_missing: "scientific-context",
    additional_role_lastname_missing: "scientific-context",
    collection_origin_missing: "scientific-context",
    existence_status_missing: "curation",
    availability_status_missing: "curation",
    relation_resource_type_missing: "related-resources",
    attachment_metadata_missing: "related-resources",
    attachment_limit_exceeded: "related-resources",
    parent_not_found: "parent",
    user_not_verified: null,
  };

type TabCompleteness = { filled: number; total: number };

export function tabCompleteness(
  requirements: readonly PublishRequirement[],
): Partial<Record<SampleFormTab, TabCompleteness>> {
  const completeness: Partial<Record<SampleFormTab, TabCompleteness>> = {};
  for (const { blocker, isMet } of requirements) {
    const tab = PUBLISH_BLOCKER_TAB[blocker];
    if (tab === null) continue;
    const { filled, total } = completeness[tab] ?? { filled: 0, total: 0 };
    completeness[tab] = {
      filled: isMet ? filled + 1 : filled,
      total: total + 1,
    };
  }
  return completeness;
}
