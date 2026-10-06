import type { Age } from "../age/model.ts";
import type { Location } from "../location/model.ts";
import type { Sample } from "../sample.ts";
import type { ScientificContext } from "../scientific-context/model.ts";

import { joinContactName } from "../contact-name.ts";
import { createSampleLabels, type Messages } from "../create-sample-labels.ts";
import { countryLabel } from "../location/country-label.ts";
import { ancestorPaths } from "../path/ancestor-paths.ts";

export type CardSample = Pick<
  Sample,
  | "igsn"
  | "internalNumber"
  | "name"
  | "nature"
  | "type"
  | "material"
  | "specificName"
  | "location"
  | "scientificContext"
  | "collectionMethod"
  | "age"
>;

type PickableField = {
  key: string;
  label: () => string;
  section: () => string;
};

type CardField = PickableField & {
  get: (sample: CardSample) => string | null;
};

type CardFields = {
  PICKABLE_FIELDS: readonly (PickableField & { locked: boolean })[];
  OPTIONAL_CARD_FIELDS: readonly CardField[];
  selectedCardFields: (keys: readonly string[] | undefined) => CardField[];
  pickedCardFieldKeys: (keys: readonly string[] | undefined) => string[];
  typeText: (sample: CardSample) => string | null;
  typeNatureText: (sample: CardSample) => string | null;
  collectorText: (sample: CardSample) => string | null;
  materialText: (sample: CardSample) => string | null;
  locationText: (
    location: Pick<Location, "region" | "localityName"> | null,
  ) => string | null;
  formatNumericAge: (age: Age) => string | null;
  formatGeologicalAge: (age: Age) => string | null;
};

type AllKeys<T> = T extends unknown ? keyof T : never;

const joinPath = (segments: (string | null | undefined)[]): string | null =>
  segments.filter(Boolean).join(" > ") || null;

const pathText = (
  path: string | null,
  pathLabel: (path: string) => string,
): string[] => (path ? ancestorPaths(path).map(pathLabel) : []);

function contextText(
  sample: CardSample,
  key: AllKeys<ScientificContext>,
): string | null {
  const context: Record<string, unknown> = sample.scientificContext ?? {};
  const value = context[key];
  return typeof value === "string" ? value : null;
}

export function createCardFields(
  m: Messages,
  getLocale: () => string,
): CardFields {
  const {
    collectionMethodLabel,
    geologicalAgeLabel,
    materialPathLabel,
    natureLabel,
    numericUnitLabel,
    oceanSeaLabel,
    typeLabel,
    yearsUnitShortLabel,
  } = createSampleLabels(m);
  const text =
    (key: keyof Messages): (() => string) =>
    () =>
      m[key]?.() ?? key;

  function formatNumericAge(age: Age): string | null {
    const { numericAgeMin: min, numericAgeMax: max } = age;
    if (min == null && max == null) return null;
    const unitLabel = age.numericAgeUnit
      ? ` ${numericUnitLabel(age.numericAgeUnit)}`
      : "";
    const yearsLabel = age.numericAgeYearsUnit
      ? ` ${yearsUnitShortLabel(age.numericAgeYearsUnit)}`
      : "";
    const suffix = `${unitLabel}${yearsLabel}`;
    if (min != null && max != null && min !== max) {
      return `${min}-${max}${suffix}`;
    }
    return `${min ?? max}${suffix}`;
  }

  function formatGeologicalAge(age: Age): string | null {
    const { geologicalAgeMin: min, geologicalAgeMax: max } = age;
    if (!min && !max) return null;
    if (min && max && min !== max) {
      return `${geologicalAgeLabel(min)}-${geologicalAgeLabel(max)}`;
    }
    const one = min ?? max;
    return one ? geologicalAgeLabel(one) : null;
  }

  const typeText = (sample: CardSample): string | null =>
    joinPath(pathText(sample.type, typeLabel));

  const typeNatureText = (sample: CardSample): string | null =>
    [typeText(sample), sample.nature ? natureLabel(sample.nature) : null]
      .filter(Boolean)
      .join(" / ") || null;

  const materialText = (sample: CardSample): string | null =>
    joinPath([
      ...pathText(sample.material, materialPathLabel),
      sample.specificName,
    ]);

  function locationText(
    location: Pick<Location, "region" | "localityName"> | null,
  ): string | null {
    const region = location?.region;
    const regionName =
      region?.kind === "country"
        ? region.country && countryLabel(region.country, getLocale())
        : region?.oceanSea && oceanSeaLabel(region.oceanSea);
    return joinPath([regionName, location?.localityName]);
  }

  const collectorText = (sample: CardSample): string | null =>
    joinContactName(
      contextText(sample, "collectorFirstname"),
      contextText(sample, "collectorLastname"),
    ) || null;

  const contextField = (
    key: AllKeys<ScientificContext>,
    label: () => string,
  ): CardField => ({
    key,
    label,
    section: text("sample_section_scientific_context"),
    get: (sample) => contextText(sample, key),
  });

  const LEADING_LOCKED_FIELDS: readonly PickableField[] = [
    {
      key: "name",
      label: text("card_field_name"),
      section: text("sample_section_sample"),
    },
    {
      key: "igsn",
      label: text("card_field_igsn"),
      section: text("sample_section_sample"),
    },
  ];

  const INTERNAL_NUMBER_FIELD: PickableField = {
    key: "internalNumber",
    label: text("card_field_internal_id"),
    section: text("sample_section_sample"),
  };

  const LOCKED_FIELDS: readonly PickableField[] = [
    {
      key: "typeNature",
      label: text("card_field_type_nature"),
      section: text("sample_section_sample"),
    },
    {
      key: "material",
      label: text("sample_field_material"),
      section: text("sample_section_sample"),
    },
    {
      key: "location",
      label: text("card_field_location"),
      section: text("sample_section_location"),
    },
    {
      key: "collectorName",
      label: text("sample_field_collector_name"),
      section: text("sample_section_scientific_context"),
    },
  ];

  const OPTIONAL_CARD_FIELDS: readonly CardField[] = [
    {
      key: "collectionMethod",
      label: text("sample_field_collection_method"),
      section: text("sample_section_sample"),
      get: (sample) =>
        joinPath(pathText(sample.collectionMethod, collectionMethodLabel)),
    },
    contextField("researchProgramName", text("facet_research_program_name")),
    {
      key: "chiefScientist",
      label: text("facet_chief_scientist"),
      section: text("sample_section_scientific_context"),
      get: (sample) =>
        joinContactName(
          contextText(sample, "chiefScientistFirstname"),
          contextText(sample, "chiefScientistLastname"),
        ) || null,
    },
    {
      key: "numericAge",
      label: text("sample_field_numeric_age"),
      section: text("sample_section_age"),
      get: (sample) => sample.age && formatNumericAge(sample.age),
    },
    {
      key: "geologicalAge",
      label: text("sample_field_geological_age"),
      section: text("sample_section_age"),
      get: (sample) => sample.age && formatGeologicalAge(sample.age),
    },
  ];

  const PICKABLE_FIELDS = [
    ...LEADING_LOCKED_FIELDS.map((field) => ({ ...field, locked: true })),
    { ...INTERNAL_NUMBER_FIELD, locked: false },
    ...LOCKED_FIELDS.map((field) => ({ ...field, locked: true })),
    ...OPTIONAL_CARD_FIELDS.map((field) => ({ ...field, locked: false })),
  ];

  return {
    PICKABLE_FIELDS,
    OPTIONAL_CARD_FIELDS,
    selectedCardFields: (keys) => {
      const picked = new Set(keys ?? []);
      return OPTIONAL_CARD_FIELDS.filter((field) => picked.has(field.key));
    },
    pickedCardFieldKeys: (keys) => {
      const picked = new Set(keys ?? []);
      return PICKABLE_FIELDS.filter(
        (field) => !field.locked && picked.has(field.key),
      ).map((field) => field.key);
    },
    typeText,
    typeNatureText,
    collectorText,
    materialText,
    locationText,
    formatNumericAge,
    formatGeologicalAge,
  };
}
