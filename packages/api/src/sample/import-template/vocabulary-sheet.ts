import {
  laboratoryLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { ORGANIZATIONS } from "@projet-igsn/domain/institutional-group/organization";
import { OSUS } from "@projet-igsn/domain/institutional-group/osu";
import { ADDITIONAL_ROLES } from "@projet-igsn/domain/sample/additional-role/role";
import { GEOLOGICAL_AGES } from "@projet-igsn/domain/sample/age/geological-age";
import { NUMERIC_UNITS } from "@projet-igsn/domain/sample/age/numeric-unit";
import { yearsUnitSchema } from "@projet-igsn/domain/sample/age/years-unit";
import { COLLECTION_METHODS } from "@projet-igsn/domain/sample/collection-method/vocabulary";
import { HUMIDITY_TYPES } from "@projet-igsn/domain/sample/condition/humidity-type";
import { LIGHTS } from "@projet-igsn/domain/sample/condition/light";
import { PACKAGINGS } from "@projet-igsn/domain/sample/condition/packaging";
import { PRESSURE_TYPES } from "@projet-igsn/domain/sample/condition/pressure-type";
import {
  PRESSURE_UNITS,
  pressureUnitLabel,
} from "@projet-igsn/domain/sample/condition/pressure-unit";
import { STORAGE_CONDITIONS } from "@projet-igsn/domain/sample/condition/storage-condition";
import { TEMPERATURE_TYPES } from "@projet-igsn/domain/sample/condition/temperature-type";
import {
  TEMPERATURE_UNITS,
  temperatureUnitLabel,
} from "@projet-igsn/domain/sample/condition/temperature-unit";
import { AVAILABILITY_STATUSES } from "@projet-igsn/domain/sample/curation/availability-status";
import { EXISTENCE_STATUSES } from "@projet-igsn/domain/sample/curation/existence-status";
import { MASS_UNITS } from "@projet-igsn/domain/sample/description/mass-unit";
import { SIZE_UNITS } from "@projet-igsn/domain/sample/description/size-unit";
import {
  VOLUME_UNITS,
  volumeUnitLabel,
} from "@projet-igsn/domain/sample/description/volume-unit";
import { ELEMENTS } from "@projet-igsn/domain/sample/element/vocabulary";
import { COUNTRIES } from "@projet-igsn/domain/sample/location/country";
import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";
import { NAVIGATION_TYPES } from "@projet-igsn/domain/sample/location/navigation-type";
import { OCEAN_SEAS } from "@projet-igsn/domain/sample/location/ocean-sea";
import { REGION_HIERARCHY } from "@projet-igsn/domain/sample/location/region";
import { VERTICAL_REFERENCES } from "@projet-igsn/domain/sample/location/vertical-reference";
import { VERTICAL_REFERENCE_SYSTEMS } from "@projet-igsn/domain/sample/location/vertical-reference-system";
import { MATERIAL_PATHS } from "@projet-igsn/domain/sample/material/classification";
import { METAMORPHIC_FABRICS } from "@projet-igsn/domain/sample/metamorphic-fabric/vocabulary";
import { METAMORPHIC_FACIES } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";
import { NATURES } from "@projet-igsn/domain/sample/nature";
import { expandPaths } from "@projet-igsn/domain/sample/path/expand-paths";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import { PHYSIOGRAPHIC_ENVIRONMENTS } from "@projet-igsn/domain/sample/physiographic-environment/vocabulary";
import {
  IDENTIFIER_TYPES,
  identifierTypeLabel,
} from "@projet-igsn/domain/sample/relation/identifier-type";
import { RELATION_TYPES } from "@projet-igsn/domain/sample/relation/relation-type";
import { RELATION_TARGET_RESOURCE_TYPES } from "@projet-igsn/domain/sample/relation/target-resource-type";
import { RESOURCE_TYPE_PATHS } from "@projet-igsn/domain/sample/resource-type/vocabulary";
import { COLLECTION_ORIGINS } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import { PLATFORM_TYPES } from "@projet-igsn/domain/sample/scientific-context/platform-type";
import { PROVENANCE_STATUSES } from "@projet-igsn/domain/sample/scientific-context/provenance-status";
import { TEXTURES } from "@projet-igsn/domain/sample/texture/vocabulary";
import { SAMPLE_TYPES } from "@projet-igsn/domain/sample/type/vocabulary";

import { SHEETS } from "./columns.ts";
import { labels } from "./labels.ts";

export type VocabularyRow = readonly [key: string, label: string, path: string];

export type VocabularyBlock = {
  id: string;
  title: string;
  hierarchy: boolean;
  codeIsReadable: boolean;
  rows: readonly VocabularyRow[];
};

export type BlockPlacement = {
  keyRange: string;
  labelRange: string;
  labelAnchor: string;
};

export const PRUNED_MATERIAL_BRANCH =
  "rock_and_sediment.synthetic_rock_mineral";

export const YES_NO_LABEL = { true: "Yes", false: "No" } as const;

export const POSITION_TYPE_LABEL = {
  point: "Point",
  area: "Area",
  line: "Line",
} as const;

export const REGION_KIND_LABEL = {
  country: "Country",
  ocean: "Ocean or sea",
} as const;

export const DATE_PRECISION_LABEL = {
  day: "Day",
  hour: "Hour and minute",
} as const;

const flat = <T extends string | number>(
  id: string,
  title: string,
  codes: readonly T[],
  label: (code: T) => string,
  codeIsReadable = false,
): VocabularyBlock => ({
  id,
  title,
  hierarchy: false,
  codeIsReadable,
  rows: codes.map((code) => [String(code), label(code), ""] as const),
});

const hierarchy = (
  id: string,
  title: string,
  paths: readonly string[],
  label: (path: string) => string,
): VocabularyBlock[] => {
  const breadcrumb = (path: string) => {
    const segments = path.split(".");
    return segments
      .slice(0, -1)
      .map((_, index) => label(segments.slice(0, index + 1).join(".")))
      .join(" > ");
  };
  const depth = Math.max(...paths.map((path) => path.split(".").length));
  return Array.from({ length: depth }, (_, index) => {
    const level = index + 1;
    return {
      id: `${id}_${level}`,
      title: `${title} (level ${level})`,
      hierarchy: true,
      codeIsReadable: false,
      rows: paths
        .filter((path) => path.split(".").length === level)
        .map((path): VocabularyRow => [breadcrumb(path), label(path), path])
        .sort((left, right) => left[0].localeCompare(right[0])),
    };
  });
};

const ORGANIZATION_NAME = new Map(
  ORGANIZATIONS.map((organization) => [organization.ror, organization.name]),
);

const identity = (code: string) => code;

const REGION_PATH_LABEL: Record<string, string> = {
  country: REGION_KIND_LABEL.country,
  ocean: REGION_KIND_LABEL.ocean,
  ...Object.fromEntries(
    COUNTRIES.map((code) => [`country.${code}`, countryLabel(code, "en")]),
  ),
  ...Object.fromEntries(
    OCEAN_SEAS.map((code) => [`ocean.${code}`, labels.oceanSeaLabel(code)]),
  ),
};

const regionPathLabel = (path: string) => REGION_PATH_LABEL[path] ?? path;

export const VOCABULARY_BLOCKS: readonly VocabularyBlock[] = [
  flat(
    "yes_no",
    "Yes or no",
    ["true", "false"] as const,
    (code) => YES_NO_LABEL[code],
  ),
  flat("nature", "Nature", NATURES, labels.natureLabel),
  flat("texture", "Texture", TEXTURES, labels.textureLabel),
  flat(
    "metamorphic_facies",
    "Metamorphic facies",
    METAMORPHIC_FACIES,
    labels.metamorphicFaciesLabel,
  ),
  flat(
    "metamorphic_fabric",
    "Metamorphic fabric",
    METAMORPHIC_FABRICS,
    labels.metamorphicFabricLabel,
  ),
  flat(
    "position_type",
    "Position type",
    ["point", "area", "line"] as const,
    (code) => POSITION_TYPE_LABEL[code],
  ),
  flat(
    "vertical_reference",
    "Vertical reference",
    VERTICAL_REFERENCES,
    labels.verticalReferenceLabel,
  ),
  flat(
    "vertical_reference_system",
    "Vertical reference system",
    VERTICAL_REFERENCE_SYSTEMS,
    labels.verticalReferenceSystemLabel,
  ),
  flat("navigation_type", "Navigation type", NAVIGATION_TYPES, identity, true),
  flat(
    "date_precision",
    "Date precision",
    ["day", "hour"] as const,
    (code) => DATE_PRECISION_LABEL[code],
  ),
  flat("size_unit", "Size unit", SIZE_UNITS, identity, true),
  flat("mass_unit", "Mass unit", MASS_UNITS, identity, true),
  flat(
    "volume_unit",
    "Volume unit",
    VOLUME_UNITS,
    (code) => volumeUnitLabel[code],
  ),
  flat("packaging", "Packaging", PACKAGINGS, labels.packagingLabel),
  flat(
    "storage_condition",
    "Storage condition",
    STORAGE_CONDITIONS,
    labels.storageConditionLabel,
  ),
  flat(
    "temperature_type",
    "Temperature range",
    TEMPERATURE_TYPES,
    labels.temperatureTypeLabel,
  ),
  flat(
    "temperature_unit",
    "Temperature unit",
    TEMPERATURE_UNITS,
    (code) => temperatureUnitLabel[code],
  ),
  flat(
    "humidity_type",
    "Humidity range",
    HUMIDITY_TYPES,
    labels.humidityTypeLabel,
  ),
  flat("light", "Light", LIGHTS, labels.lightLabel),
  flat(
    "pressure_type",
    "Pressure range",
    PRESSURE_TYPES,
    labels.pressureTypeLabel,
  ),
  flat(
    "pressure_unit",
    "Pressure unit",
    PRESSURE_UNITS,
    (code) => pressureUnitLabel[code],
    true,
  ),
  flat(
    "organization",
    "Organisation",
    [...ORGANIZATION_NAME.keys()],
    (ror) => ORGANIZATION_NAME.get(ror) ?? ror,
  ),
  flat(
    "osu",
    "OSU",
    OSUS.map((osu) => osu.code),
    osuLabel,
  ),
  flat(
    "laboratory",
    "UMR",
    LABORATORIES.map((laboratory) => laboratory.code),
    laboratoryLabel,
  ),
  flat(
    "provenance_status",
    "Provenance status",
    PROVENANCE_STATUSES,
    labels.provenanceStatusLabel,
  ),
  flat(
    "collection_origin",
    "Collection origin",
    COLLECTION_ORIGINS,
    labels.collectionOriginLabel,
  ),
  flat(
    "platform_type",
    "Platform type",
    PLATFORM_TYPES,
    labels.platformTypeLabel,
  ),
  flat(
    "additional_role",
    "Additional role",
    ADDITIONAL_ROLES,
    labels.additionalRoleLabel,
  ),
  flat(
    "age_numeric_unit",
    "Numeric age unit",
    NUMERIC_UNITS,
    labels.numericUnitLabel,
    true,
  ),
  flat(
    "age_years_unit",
    "Numeric age years unit",
    yearsUnitSchema.options,
    labels.yearsUnitLabel,
  ),
  flat(
    "geological_age",
    "Geological age",
    GEOLOGICAL_AGES,
    labels.geologicalAgeLabel,
  ),
  flat(
    "existence_status",
    "Existence status",
    EXISTENCE_STATUSES,
    labels.existenceStatusLabel,
  ),
  flat(
    "availability_status",
    "Availability status",
    AVAILABILITY_STATUSES,
    labels.availabilityStatusLabel,
  ),
  flat("element", "Element", ELEMENTS, labels.elementLabel),
  flat(
    "relation_type",
    "Relation type",
    RELATION_TYPES,
    labels.relationTypeLabel,
  ),
  flat(
    "identifier_type",
    "Identifier type",
    IDENTIFIER_TYPES,
    (code) => identifierTypeLabel[code],
    true,
  ),
  flat(
    "relation_resource_type",
    "Related resource type",
    RELATION_TARGET_RESOURCE_TYPES,
    labels.relationTargetResourceTypeLabel,
  ),
  ...hierarchy(
    "material",
    "Material",
    MATERIAL_PATHS.filter(
      (path) => !isPathAtOrUnder(path, PRUNED_MATERIAL_BRANCH),
    ),
    labels.materialPathLabel,
  ),
  ...hierarchy("sample_type", "Sample type", SAMPLE_TYPES, labels.typeLabel),
  ...hierarchy(
    "collection_method",
    "Collection method",
    COLLECTION_METHODS,
    labels.collectionMethodLabel,
  ),
  ...hierarchy(
    "physiographic_environment",
    "Physiographic environment",
    PHYSIOGRAPHIC_ENVIRONMENTS,
    labels.physiographicEnvironmentLabel,
  ),
  ...hierarchy(
    "resource_type",
    "Resource type",
    RESOURCE_TYPE_PATHS,
    labels.resourceTypeLabel,
  ),
  ...hierarchy(
    "region",
    "Region",
    expandPaths(REGION_HIERARCHY.nodes, REGION_HIERARCHY.roots),
    regionPathLabel,
  ),
];

const laidOut = () => {
  const rows: VocabularyRow[] = [];
  const placements: Record<string, BlockPlacement> = {};
  for (const block of VOCABULARY_BLOCKS) {
    rows.push([block.title, "", ""]);
    const start = rows.length + 1;
    rows.push(...block.rows);
    placements[block.id] = {
      keyRange: `${SHEETS.vocabularies}!$A$${start}:$A$${rows.length}`,
      labelRange: `${SHEETS.vocabularies}!$B$${start}:$B$${rows.length}`,
      labelAnchor: `${SHEETS.vocabularies}!$B$${start}`,
    };
    rows.push(["", "", ""]);
  }
  return { rows, placements };
};

const sheet = laidOut();

export const VOCABULARY_ROWS: readonly VocabularyRow[] = sheet.rows;

export const BLOCK_PLACEMENTS: Readonly<Record<string, BlockPlacement>> =
  sheet.placements;
