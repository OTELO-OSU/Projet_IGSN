import type Catalog from "../../messages/en.json";

import { type GeologicalAge } from "./age/geological-age.ts";
import { type NumericUnit } from "./age/numeric-unit.ts";
import { type YearsUnit } from "./age/years-unit.ts";
import { type Availability } from "./availability/availability.ts";
import { type HumidityType } from "./condition/humidity-type.ts";
import { type Light } from "./condition/light.ts";
import { type Packaging } from "./condition/packaging.ts";
import { type PressureType } from "./condition/pressure-type.ts";
import { type StorageCondition } from "./condition/storage-condition.ts";
import { type TemperatureType } from "./condition/temperature-type.ts";
import { type Element } from "./element/vocabulary.ts";
import { type OceanSea } from "./location/ocean-sea.ts";
import { type MetamorphicFacies } from "./metamorphic-facies/vocabulary.ts";
import { type Nature } from "./nature.ts";
import { pathSegment } from "./path/segment.ts";
import { vocabularyLabel } from "./path/vocabulary-label.ts";
import { type CollectionOrigin } from "./scientific-context/collection-origin.ts";
import { type ProvenanceStatus } from "./scientific-context/provenance-status.ts";
import { type Texture } from "./texture/vocabulary.ts";

type MessageKey = keyof typeof Catalog;

// Compile-time coverage for the flat vocabularies (input is a literal union):
// a code whose translation is missing from the catalog fails to compile here.
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
type _availabilityKeys = AssertKeys<`availability_${Availability}`>;
type _elementKeys = AssertKeys<`element_${Element}`>;
type _provenanceStatusKeys =
  AssertKeys<`provenance_status_${ProvenanceStatus}`>;
type _collectionOriginKeys =
  AssertKeys<`collection_origin_${CollectionOrigin}`>;
type _oceanSeaKeys = AssertKeys<`ocean_sea_${OceanSea}`>;

// Minus the `$`-prefixed metadata entries, e.g. `$schema`, which paraglide does
// not compile to a message.
export type Messages = Record<
  Exclude<MessageKey, `$${string}`>,
  (() => string) | undefined
>;

export type SampleLabels = {
  materialPathLabel: (path: string) => string;
  typeLabel: (path: string) => string;
  collectionMethodLabel: (path: string) => string;
  economicInterestLabel: (path: string) => string;
  elementLabel: (element: Element) => string;
  textureLabel: (texture: Texture) => string;
  metamorphicFaciesLabel: (facies: MetamorphicFacies) => string;
  natureLabel: (nature: Nature) => string;
  oceanSeaLabel: (oceanSea: OceanSea) => string;
  packagingLabel: (packaging: Packaging) => string;
  storageConditionLabel: (storageCondition: StorageCondition) => string;
  temperatureTypeLabel: (type: TemperatureType) => string;
  humidityTypeLabel: (type: HumidityType) => string;
  lightLabel: (light: Light) => string;
  pressureTypeLabel: (type: PressureType) => string;
  numericUnitLabel: (unit: NumericUnit) => string;
  yearsUnitLabel: (unit: YearsUnit) => string;
  geologicalAgeLabel: (age: GeologicalAge) => string;
  availabilityLabel: (availability: Availability) => string;
  provenanceStatusLabel: (status: ProvenanceStatus) => string;
  collectionOriginLabel: (origin: CollectionOrigin) => string;
};

const LABEL_KEY = {
  materialPathLabel: ["material", "path"],
  typeLabel: ["type", "path"],
  collectionMethodLabel: ["collection_method", "path"],
  economicInterestLabel: ["economic_interest", "path"],
  elementLabel: ["element", "code"],
  textureLabel: ["texture", "code"],
  metamorphicFaciesLabel: ["metamorphic_facies", "code"],
  natureLabel: ["nature", "code"],
  oceanSeaLabel: ["ocean_sea", "code"],
  packagingLabel: ["packaging", "code"],
  storageConditionLabel: ["storage_condition", "code"],
  temperatureTypeLabel: ["temperature", "code"],
  humidityTypeLabel: ["humidity", "code"],
  lightLabel: ["light", "code"],
  pressureTypeLabel: ["pressure", "code"],
  numericUnitLabel: ["age_unit", "code"],
  yearsUnitLabel: ["age_years", "code"],
  geologicalAgeLabel: ["age_ics", "code"],
  availabilityLabel: ["availability", "code"],
  provenanceStatusLabel: ["provenance_status", "code"],
  collectionOriginLabel: ["collection_origin", "code"],
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
    // The value types differ per label (a code, a path, a rank integer), which
    // Object.fromEntries cannot carry.
  ) as unknown as SampleLabels;
}
