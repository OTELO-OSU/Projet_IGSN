import type Catalog from "../../messages/en.json";

import { type GeologicalAge } from "./age/geological-age.ts";
import { type NumericUnit } from "./age/numeric-unit.ts";
import { type YearsUnit } from "./age/years-unit.ts";
import { type HumidityType } from "./condition/humidity-type.ts";
import { type Light } from "./condition/light.ts";
import { type Packaging } from "./condition/packaging.ts";
import { type PressureType } from "./condition/pressure-type.ts";
import { type StorageCondition } from "./condition/storage-condition.ts";
import { type TemperatureType } from "./condition/temperature-type.ts";
import { type AvailabilityStatus } from "./curation/availability-status.ts";
import { type ExistenceStatus } from "./curation/existence-status.ts";
import { type Element } from "./element/vocabulary.ts";
import { type OceanSea } from "./location/ocean-sea.ts";
import { type VerticalReferenceSystem } from "./location/vertical-reference-system.ts";
import { type VerticalReference } from "./location/vertical-reference.ts";
import { type MetamorphicFacies } from "./metamorphic-facies/vocabulary.ts";
import { type Nature } from "./nature.ts";
import { pathSegment } from "./path/segment.ts";
import { vocabularyLabel } from "./path/vocabulary-label.ts";
import { type CollectionOrigin } from "./scientific-context/collection-origin.ts";
import { type ProvenanceStatus } from "./scientific-context/provenance-status.ts";
import { type ExperimentType } from "./synthetic-details/experiment-type.ts";
import { type FinalProduct } from "./synthetic-details/final-product.ts";
import { type StartingMaterialNature } from "./synthetic-details/starting-material-nature.ts";
import { type StartingMaterial } from "./synthetic-details/starting-material.ts";
import { type Texture } from "./texture/vocabulary.ts";

type MessageKey = keyof typeof Catalog;

type AssertKeys<T extends MessageKey> = T;
type _natureKeys = AssertKeys<`nature_${Nature}`>;
type _textureKeys = AssertKeys<`texture_${Texture}`>;
type _faciesKeys = AssertKeys<`metamorphic_facies_${MetamorphicFacies}`>;
type _packagingKeys = AssertKeys<`packaging_${Packaging}`>;
type _storageConditionKeys =
  AssertKeys<`storage_condition_${StorageCondition}`>;
type _temperatureTypeKeys = AssertKeys<`temperature_${TemperatureType}`>;
type _humidityTypeKeys = AssertKeys<`humidity_${HumidityType}`>;
type _lightKeys = AssertKeys<`light_${Light}`>;
type _pressureTypeKeys = AssertKeys<`pressure_${PressureType}`>;
type _numericUnitKeys = AssertKeys<`age_unit_${NumericUnit}`>;
type _yearsUnitKeys = AssertKeys<`age_years_${YearsUnit}`>;
type _geologicalAgeKeys = AssertKeys<`age_ics_${GeologicalAge}`>;
type _existenceStatusKeys = AssertKeys<`existence_status_${ExistenceStatus}`>;
type _availabilityStatusKeys =
  AssertKeys<`availability_status_${AvailabilityStatus}`>;
type _elementKeys = AssertKeys<`element_${Element}`>;
type _provenanceStatusKeys =
  AssertKeys<`provenance_status_${ProvenanceStatus}`>;
type _collectionOriginKeys =
  AssertKeys<`collection_origin_${CollectionOrigin}`>;
type _startingMaterialKeys =
  AssertKeys<`starting_material_${StartingMaterial}`>;
type _startingMaterialNatureKeys =
  AssertKeys<`starting_material_nature_${StartingMaterialNature}`>;
type _finalProductKeys = AssertKeys<`final_product_${FinalProduct}`>;
type _experimentTypeKeys = AssertKeys<`experiment_type_${ExperimentType}`>;
type _oceanSeaKeys = AssertKeys<`ocean_sea_${OceanSea}`>;
type _verticalReferenceKeys =
  AssertKeys<`vertical_reference_${VerticalReference}`>;
type _verticalReferenceSystemKeys =
  AssertKeys<`vertical_reference_system_${VerticalReferenceSystem}`>;

export type Messages = Record<
  Exclude<MessageKey, `$${string}`>,
  (() => string) | undefined
>;

export type SampleLabels = {
  materialPathLabel: (path: string) => string;
  typeLabel: (path: string) => string;
  collectionMethodLabel: (path: string) => string;
  resourceTypeLabel: (path: string) => string;
  geomorphologicalEnvironmentLabel: (path: string) => string;
  elementLabel: (element: Element) => string;
  textureLabel: (texture: Texture) => string;
  metamorphicFaciesLabel: (facies: MetamorphicFacies) => string;
  natureLabel: (nature: Nature) => string;
  oceanSeaLabel: (oceanSea: OceanSea) => string;
  verticalReferenceLabel: (reference: VerticalReference) => string;
  verticalReferenceSystemLabel: (system: VerticalReferenceSystem) => string;
  packagingLabel: (packaging: Packaging) => string;
  storageConditionLabel: (storageCondition: StorageCondition) => string;
  temperatureTypeLabel: (type: TemperatureType) => string;
  humidityTypeLabel: (type: HumidityType) => string;
  lightLabel: (light: Light) => string;
  pressureTypeLabel: (type: PressureType) => string;
  numericUnitLabel: (unit: NumericUnit) => string;
  yearsUnitLabel: (unit: YearsUnit) => string;
  geologicalAgeLabel: (age: GeologicalAge) => string;
  existenceStatusLabel: (status: ExistenceStatus) => string;
  availabilityStatusLabel: (status: AvailabilityStatus) => string;
  provenanceStatusLabel: (status: ProvenanceStatus) => string;
  collectionOriginLabel: (origin: CollectionOrigin) => string;
  startingMaterialLabel: (nature: StartingMaterial) => string;
  startingMaterialNatureLabel: (form: StartingMaterialNature) => string;
  finalProductLabel: (product: FinalProduct) => string;
  experimentTypeLabel: (type: ExperimentType) => string;
};

const LABEL_KEY = {
  materialPathLabel: ["material", "path"],
  typeLabel: ["type", "path"],
  collectionMethodLabel: ["collection_method", "path"],
  resourceTypeLabel: ["resource_type", "path"],
  geomorphologicalEnvironmentLabel: ["geomorphological_environment", "path"],
  elementLabel: ["element", "code"],
  textureLabel: ["texture", "code"],
  metamorphicFaciesLabel: ["metamorphic_facies", "code"],
  natureLabel: ["nature", "code"],
  oceanSeaLabel: ["ocean_sea", "code"],
  verticalReferenceLabel: ["vertical_reference", "code"],
  verticalReferenceSystemLabel: ["vertical_reference_system", "code"],
  packagingLabel: ["packaging", "code"],
  storageConditionLabel: ["storage_condition", "code"],
  temperatureTypeLabel: ["temperature", "code"],
  humidityTypeLabel: ["humidity", "code"],
  lightLabel: ["light", "code"],
  pressureTypeLabel: ["pressure", "code"],
  numericUnitLabel: ["age_unit", "code"],
  yearsUnitLabel: ["age_years", "code"],
  geologicalAgeLabel: ["age_ics", "code"],
  existenceStatusLabel: ["existence_status", "code"],
  availabilityStatusLabel: ["availability_status", "code"],
  provenanceStatusLabel: ["provenance_status", "code"],
  collectionOriginLabel: ["collection_origin", "code"],
  startingMaterialLabel: ["starting_material", "code"],
  startingMaterialNatureLabel: ["starting_material_nature", "code"],
  finalProductLabel: ["final_product", "code"],
  experimentTypeLabel: ["experiment_type", "code"],
} satisfies Record<keyof SampleLabels, [string, "path" | "code"]>;

export function createSampleLabels(m: Messages): SampleLabels {
  return Object.fromEntries(
    Object.entries(LABEL_KEY).map(([name, [prefix, kind]]) => [
      name,
      vocabularyLabel(
        (value: string) =>
          `${prefix}_${kind === "path" ? pathSegment(value) : value}`,
        m,
      ),
    ]),
  ) as unknown as SampleLabels;
}
