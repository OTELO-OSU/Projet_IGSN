import {
  collectionMethodLabel,
  materialPathLabel,
  natureLabel,
  textureLabel,
  typeLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

const FACET_LABEL: Record<string, () => string> = {
  type: m.sample_field_type,
  material: m.sample_field_material,
  collectionMethod: m.sample_field_collection_method,
  nature: m.sample_field_nature,
  texture: m.sample_field_texture,
  researchProgramName: m.facet_research_program_name,
  researchProgramChief: m.facet_research_program_chief,
  researchCampaign: m.facet_research_campaign,
  collectorName: m.facet_collector_name,
  collectionCurator: m.facet_collection_curator,
  age: m.sample_section_age,
};

export const facetLabel = (key: string): string => FACET_LABEL[key]?.() ?? key;

// The vocabulary resolvers accept any string at runtime, and the facet cascade
// only ever passes real codes, so the enum ones are widened here.
const FACET_VALUE_LABEL: Record<string, (code: string) => string> = {
  type: typeLabel,
  material: materialPathLabel,
  collectionMethod: collectionMethodLabel,
  nature: natureLabel as (code: string) => string,
  texture: textureLabel as (code: string) => string,
};

const identity = (code: string) => code;

export const facetValueLabel = (key: string): ((code: string) => string) =>
  FACET_VALUE_LABEL[key] ?? identity;
