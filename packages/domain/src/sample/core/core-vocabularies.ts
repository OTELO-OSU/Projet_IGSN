import type { SampleLabels } from "../create-sample-labels.ts";
import type { CoreEnum } from "./core-enum.ts";

import { GEOLOGICAL_AGES } from "../age/geological-age.ts";
import { COLLECTION_METHODS } from "../collection-method/vocabulary.ts";
import { HUMIDITY_TYPES } from "../condition/humidity-type.ts";
import { LIGHTS } from "../condition/light.ts";
import { PACKAGINGS } from "../condition/packaging.ts";
import { PRESSURE_TYPES } from "../condition/pressure-type.ts";
import {
  PRESSURE_UNITS,
  pressureUnitLabel,
} from "../condition/pressure-unit.ts";
import { STORAGE_CONDITIONS } from "../condition/storage-condition.ts";
import { TEMPERATURE_TYPES } from "../condition/temperature-type.ts";
import {
  TEMPERATURE_UNITS,
  temperatureUnitLabel,
} from "../condition/temperature-unit.ts";
import { MASS_UNITS } from "../description/mass-unit.ts";
import { SIZE_UNITS } from "../description/size-unit.ts";
import { VOLUME_UNITS, volumeUnitLabel } from "../description/volume-unit.ts";
import { ELEMENTS } from "../element/vocabulary.ts";
import { countryLabel } from "../location/country-label.ts";
import { COUNTRIES } from "../location/country.ts";
import { NAVIGATION_TYPES } from "../location/navigation-type.ts";
import { OCEAN_SEAS } from "../location/ocean-sea.ts";
import { VERTICAL_REFERENCE_SYSTEMS } from "../location/vertical-reference-system.ts";
import { MATERIAL_PATHS } from "../material/classification.ts";
import { METAMORPHIC_FABRICS } from "../metamorphic-fabric/vocabulary.ts";
import { METAMORPHIC_FACIES } from "../metamorphic-facies/vocabulary.ts";
import { STRUNZ_PATHS } from "../mineral/mineral-hierarchy.ts";
import { MINERAL_ABUNDANCES } from "../mineral/model.ts";
import { MINERALS } from "../mineral/strunz-classification.ts";
import { NATURES } from "../nature.ts";
import { PHYSIOGRAPHIC_ENVIRONMENTS } from "../physiographic-environment/vocabulary.ts";
import { identifierTypeLabel } from "../relation/identifier-type.ts";
import { RESOURCE_TYPE_PATHS } from "../resource-type/vocabulary.ts";
import { COLLECTION_ORIGINS } from "../scientific-context/collection-origin.ts";
import { PLATFORM_TYPES } from "../scientific-context/platform-type.ts";
import { PROVENANCE_STATUSES } from "../scientific-context/provenance-status.ts";
import {
  EXPERIMENT_DURATION_UNITS,
  experimentDurationUnitLabel,
} from "../synthetic-details/experiment-duration-unit.ts";
import { EXPERIMENT_TYPES } from "../synthetic-details/experiment-type.ts";
import { FINAL_PRODUCTS } from "../synthetic-details/final-product.ts";
import { STARTING_MATERIAL_NATURES } from "../synthetic-details/starting-material-nature.ts";
import { STARTING_MATERIALS } from "../synthetic-details/starting-material.ts";
import { TEXTURES } from "../texture/vocabulary.ts";
import { SAMPLE_TYPES } from "../type/vocabulary.ts";
import { ADDITIONAL_ROLE_BY_CORE_ROLE } from "./core-additional-role.ts";
import {
  coreAvailabilityStatus,
  coreExistenceStatus,
} from "./core-curation-schema.ts";
import {
  coreNumericAgeEra,
  coreNumericAgeUnit,
  toChronostratigraphy,
} from "./core-extensions-schema.ts";
import {
  CORE_DATE_PRECISIONS,
  CORE_POSITIVE_DIRECTIONS,
  CORE_SYNTHESIS_STEP,
  coreProcessStepKind,
  coreVerticalReference,
} from "./core-production-schema.ts";
import {
  coreIdentifierType,
  coreRelationType,
  coreTargetResourceType,
} from "./core-relation-schema.ts";
import { CORE_ROLES, CORE_TITLE_TYPES } from "./core-sample-schema.ts";
import { toVerticalDatum } from "./vertical-datum.ts";

type CoreVocabularyValue = { id: string | number; label: string };

export type CoreVocabulary = {
  id: string;
  schemeName?: string;
  values: CoreVocabularyValue[];
};

const valuesOf = <T extends string | number>(
  codes: readonly T[],
  label: (code: T) => string,
  toId: (code: T) => string | number = (code) => code,
): CoreVocabularyValue[] =>
  codes.map((code) => ({ id: toId(code), label: label(code) }));

const enumValues = <T extends string>(
  { values, toCore }: CoreEnum<T>,
  label: (code: T) => string,
): CoreVocabularyValue[] => valuesOf(values, label, toCore);

const concept = (
  scheme: string,
  values: CoreVocabularyValue[],
  id = scheme,
): CoreVocabulary => ({ id, schemeName: `otelo:${scheme}`, values });

export function coreVocabularies(
  labels: SampleLabels,
  locale: string,
): readonly CoreVocabulary[] {
  return [
    concept("material", valuesOf(MATERIAL_PATHS, labels.materialPathLabel)),
    concept("sample-type", valuesOf(SAMPLE_TYPES, labels.typeLabel)),
    concept("nature-of-sample", valuesOf(NATURES, labels.natureLabel)),
    concept("texture", valuesOf(TEXTURES, labels.textureLabel)),
    concept(
      "metamorphic-facies",
      valuesOf(METAMORPHIC_FACIES, labels.metamorphicFaciesLabel),
    ),
    concept(
      "metamorphic-fabric",
      valuesOf(METAMORPHIC_FABRICS, labels.metamorphicFabricLabel),
    ),
    concept(
      "physiographic-environment",
      valuesOf(
        PHYSIOGRAPHIC_ENVIRONMENTS,
        labels.physiographicEnvironmentLabel,
      ),
    ),
    concept(
      "resource-type",
      valuesOf(RESOURCE_TYPE_PATHS, labels.resourceTypeLabel),
    ),
    concept("element", valuesOf(ELEMENTS, labels.elementLabel)),
    concept(
      "strunz-mindat",
      valuesOf(STRUNZ_PATHS, labels.mineralClassificationLabel),
    ),
    concept(
      "humidity-type",
      valuesOf(HUMIDITY_TYPES, labels.humidityTypeLabel),
    ),
    concept(
      "pressure-type",
      valuesOf(PRESSURE_TYPES, labels.pressureTypeLabel),
    ),
    concept("light", valuesOf(LIGHTS, labels.lightLabel)),
    concept("packaging", valuesOf(PACKAGINGS, labels.packagingLabel)),
    concept("ocean-sea", valuesOf(OCEAN_SEAS, labels.oceanSeaLabel)),
    concept("navigation-type", valuesOf(NAVIGATION_TYPES, String)),
    concept(
      "experiment-type",
      valuesOf(EXPERIMENT_TYPES, labels.experimentTypeLabel),
    ),
    concept(
      "platform-type",
      valuesOf(PLATFORM_TYPES, labels.platformTypeLabel),
    ),
    concept("sample_condition", [
      ...valuesOf(STORAGE_CONDITIONS, labels.storageConditionLabel),
      ...valuesOf(TEMPERATURE_TYPES, labels.temperatureTypeLabel),
    ]),
    concept(
      "sample_description",
      valuesOf(COLLECTION_METHODS, labels.collectionMethodLabel),
    ),
    concept(
      "scientificContext",
      valuesOf(PROVENANCE_STATUSES, labels.provenanceStatusLabel),
      "provenance-status",
    ),
    concept(
      "scientificContext",
      valuesOf(COLLECTION_ORIGINS, labels.collectionOriginLabel),
      "collection-origin",
    ),
    {
      id: "existenceStatus",
      values: enumValues(coreExistenceStatus, labels.existenceStatusLabel),
    },
    {
      id: "availabilityStatus",
      values: enumValues(
        coreAvailabilityStatus,
        labels.availabilityStatusLabel,
      ),
    },
    {
      id: "relationType",
      values: enumValues(coreRelationType, labels.relationTypeLabel),
    },
    {
      id: "identifierType",
      values: enumValues(
        coreIdentifierType,
        (type) => identifierTypeLabel[type],
      ),
    },
    {
      id: "targetResourceType",
      values: enumValues(coreTargetResourceType, (type) =>
        type === "physical_object"
          ? coreTargetResourceType.toCore(type)
          : labels.relationTargetResourceTypeLabel(type),
      ),
    },
    {
      id: "roles",
      values: valuesOf(CORE_ROLES, (role) => {
        const additionalRole = ADDITIONAL_ROLE_BY_CORE_ROLE[role];
        return additionalRole == null
          ? labels.coreRoleLabel(role)
          : labels.additionalRoleLabel(additionalRole);
      }),
    },
    {
      id: "titleType",
      values: valuesOf(CORE_TITLE_TYPES, labels.titleTypeLabel),
    },
    {
      id: "stepType",
      values: [
        ...valuesOf([CORE_SYNTHESIS_STEP], labels.stepTypeLabel),
        ...enumValues(coreProcessStepKind, labels.processStepKindLabel),
      ],
    },
    {
      id: "collectionDatePrecision",
      values: valuesOf(
        CORE_DATE_PRECISIONS,
        labels.collectionDatePrecisionLabel,
      ),
    },
    {
      id: "countryCodes",
      values: valuesOf(COUNTRIES, (code) => countryLabel(code, locale)),
    },
    {
      id: "chronostratigraphy",
      values: valuesOf(
        GEOLOGICAL_AGES,
        labels.geologicalAgeLabel,
        toChronostratigraphy,
      ),
    },
    {
      id: "verticalReference",
      values: enumValues(coreVerticalReference, labels.verticalReferenceLabel),
    },
    {
      id: "verticalDatum",
      values: valuesOf(
        VERTICAL_REFERENCE_SYSTEMS,
        labels.verticalReferenceSystemLabel,
        toVerticalDatum,
      ),
    },
    {
      id: "positiveDirection",
      values: valuesOf(CORE_POSITIVE_DIRECTIONS, labels.positiveDirectionLabel),
    },
    {
      id: "numericAgeUnit",
      values: enumValues(coreNumericAgeUnit, labels.numericUnitLabel),
    },
    {
      id: "numericAgeEra",
      values: enumValues(coreNumericAgeEra, labels.yearsUnitLabel),
    },
    {
      id: "startingMaterial",
      values: valuesOf(STARTING_MATERIALS, labels.startingMaterialLabel),
    },
    {
      id: "startingMaterialNature",
      values: valuesOf(
        STARTING_MATERIAL_NATURES,
        labels.startingMaterialNatureLabel,
      ),
    },
    {
      id: "finalProduct",
      values: valuesOf(FINAL_PRODUCTS, labels.finalProductLabel),
    },
    {
      id: "mineralAbundance",
      values: valuesOf(MINERAL_ABUNDANCES, labels.mineralAbundanceLabel),
    },
    {
      id: "mindatId",
      values: MINERALS.map(({ mindatId, name }) => ({
        id: mindatId,
        label: name,
      })),
    },
    {
      id: "temperatureUnit",
      values: valuesOf(TEMPERATURE_UNITS, (unit) => temperatureUnitLabel[unit]),
    },
    {
      id: "pressureUnit",
      values: valuesOf(PRESSURE_UNITS, (unit) => pressureUnitLabel[unit]),
    },
    { id: "massUnit", values: valuesOf(MASS_UNITS, String) },
    { id: "sizeUnit", values: valuesOf(SIZE_UNITS, String) },
    {
      id: "volumeUnit",
      values: valuesOf(VOLUME_UNITS, (unit) => volumeUnitLabel[unit]),
    },
    {
      id: "experimentDurationUnit",
      values: valuesOf(
        EXPERIMENT_DURATION_UNITS,
        (unit) => experimentDurationUnitLabel[unit],
      ),
    },
  ];
}
