import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";

import { ancestorPaths } from "#/domain/samples/ancestor-paths.ts";
import {
  formatGeologicalAge,
  formatNumericAge,
} from "#/domain/samples/format-age.ts";
import {
  collectionMethodLabel,
  materialPathLabel,
  natureLabel,
  oceanSeaLabel,
  textureLabel,
  typeLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

export type CardSample = Pick<
  Sample,
  | "igsn"
  | "name"
  | "nature"
  | "type"
  | "material"
  | "specificName"
  | "location"
  | "scientificContext"
  | "collectionMethod"
  | "texture"
  | "age"
>;

type PickableField = {
  key: string;
  label: () => string;
  section: () => string;
};

export type CardField = PickableField & {
  get: (sample: CardSample) => string | null;
};

const joinPath = (segments: (string | null | undefined)[]): string | null =>
  segments.filter(Boolean).join(" > ") || null;

const pathText = (
  path: string | null,
  pathLabel: (path: string) => string,
): string[] => (path ? ancestorPaths(path).map(pathLabel) : []);

export function typeNatureText(sample: CardSample): string | null {
  return (
    [joinPath(pathText(sample.type, typeLabel)), natureLabel(sample.nature)]
      .filter(Boolean)
      .join(" / ") || null
  );
}

export function materialText(sample: CardSample): string | null {
  return joinPath([
    ...pathText(sample.material, materialPathLabel),
    sample.specificName,
  ]);
}

export function locationText(location: Location | null): string | null {
  const region = location?.region;
  const regionName =
    region?.kind === "continent"
      ? region.country && countryLabel(region.country, getLocale())
      : region?.oceanSea && oceanSeaLabel(region.oceanSea);
  return joinPath([regionName, location?.localityName]);
}

type AllKeys<T> = T extends unknown ? keyof T : never;

function contextText(
  sample: CardSample,
  key: AllKeys<ScientificContext>,
): string | null {
  const context: Record<string, unknown> = sample.scientificContext ?? {};
  const value = context[key];
  return typeof value === "string" ? value : null;
}

function contextField(
  key: AllKeys<ScientificContext>,
  label: () => string,
): CardField {
  return {
    key,
    label,
    section: m.sample_section_scientific_context,
    get: (sample) => contextText(sample, key),
  };
}

const LOCKED_FIELDS: readonly PickableField[] = [
  { key: "name", label: m.card_field_name, section: m.sample_section_sample },
  { key: "igsn", label: m.card_field_igsn, section: m.sample_section_sample },
  {
    key: "typeNature",
    label: m.card_field_type_nature,
    section: m.sample_section_sample,
  },
  {
    key: "material",
    label: m.sample_field_material,
    section: m.sample_section_sample,
  },
  {
    key: "location",
    label: m.card_field_location,
    section: m.sample_section_location,
  },
  {
    key: "collectorName",
    label: m.sample_field_collector_name,
    section: m.sample_section_scientific_context,
  },
];

const OPTIONAL_CARD_FIELDS: readonly CardField[] = [
  {
    key: "collectionMethod",
    label: m.sample_field_collection_method,
    section: m.sample_section_sample,
    get: (sample) =>
      joinPath(pathText(sample.collectionMethod, collectionMethodLabel)),
  },
  {
    key: "texture",
    label: m.sample_field_texture,
    section: m.sample_section_sample,
    get: (sample) => sample.texture && textureLabel(sample.texture),
  },
  contextField("researchProgramName", m.facet_research_program_name),
  contextField("researchProgramChief", m.facet_research_program_chief),
  contextField("researchCampaign", m.facet_research_campaign),
  contextField("collectionCurator", m.facet_collection_curator),
  {
    key: "numericAge",
    label: m.sample_field_numeric_age,
    section: m.sample_section_age,
    get: (sample) => sample.age && formatNumericAge(sample.age),
  },
  {
    key: "geologicalAge",
    label: m.sample_field_geological_age,
    section: m.sample_section_age,
    get: (sample) => sample.age && formatGeologicalAge(sample.age),
  },
];

export const PICKABLE_FIELDS: readonly (PickableField & {
  locked: boolean;
})[] = [
  ...LOCKED_FIELDS.map((field) => ({ ...field, locked: true })),
  ...OPTIONAL_CARD_FIELDS.map((field) => ({ ...field, locked: false })),
];

export function selectedCardFields(
  keys: readonly string[] | undefined,
): CardField[] {
  const picked = new Set(keys ?? []);
  return OPTIONAL_CARD_FIELDS.filter((field) => picked.has(field.key));
}
