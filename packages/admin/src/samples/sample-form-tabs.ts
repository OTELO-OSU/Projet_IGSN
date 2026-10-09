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
import { z } from "zod";

import type { SampleDraft } from "#/samples/sample-draft-schema.ts";
import type { RequiredField } from "#/samples/sample-required-fields.ts";

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

export const sampleFormTabSchema = z.enum(
  SAMPLE_FORM_TABS.map(({ value }) => value),
);

const FIELD_TAB: Record<keyof SampleDraft | "attachments", SampleFormTab> = {
  name: "identity",
  localId: "identity",
  localIdDescription: "identity",
  nature: "identity",
  typePath: "identity",
  collectionMethodPath: "identity",
  collectionMethodDescription: "identity",
  processSteps: "identity",
  manualGroupIds: "identity",
  childIds: "identity",
  materialPath: "classification",
  texture: "classification",
  metamorphicFacies: "classification",
  metamorphicFabric: "classification",
  specificName: "classification",
  mineralClassifications: "classification",
  resourceTypePath: "classification",
  economicInterestElements: "classification",
  economicResourceTypePrecision: "classification",
  economicDepositName: "classification",
  economicDepositDescription: "classification",
  syntheticDetails: "classification",
  location: "location",
  geologicalContextDescription: "location",
  physiographicEnvironmentPath: "location",
  age: "age",
  description: "physical-description",
  scientificContext: "scientific-context",
  condition: "conservation",
  security: "conservation",
  existenceStatus: "curation",
  availabilityStatus: "curation",
  repository: "curation",
  relations: "related-resources",
  attachments: "related-resources",
  parentIds: "parent",
};

export function sampleFieldTab(name: string): SampleFormTab | undefined {
  if (
    name.startsWith("description.collectionDate") ||
    name === "scientificContext.provenanceStatus"
  ) {
    return "identity";
  }
  return FIELD_TAB[name.split(/[.[]/, 1)[0] as keyof typeof FIELD_TAB];
}

export type SampleFormCompleteness = Partial<
  Record<SampleFormTab, { filled: number; total: number }>
>;

export function tabCompleteness(
  fields: readonly RequiredField[],
): SampleFormCompleteness {
  const completeness: SampleFormCompleteness = {};
  for (const { name, isMet } of fields) {
    const tab = sampleFieldTab(name);
    if (tab === undefined) continue;
    const { filled, total } = completeness[tab] ?? { filled: 0, total: 0 };
    completeness[tab] = {
      filled: isMet ? filled + 1 : filled,
      total: total + 1,
    };
  }
  return completeness;
}
