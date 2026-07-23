import type Catalog from "../../messages/en.json";

import { type GeologicalAge } from "./age/geological-age.ts";
import { type NumericUnit } from "./age/numeric-unit.ts";
import { type YearsUnit } from "./age/years-unit.ts";
import { type Availability } from "./availability/availability.ts";
import { collectionMethodLabelKey } from "./collection-method/label.ts";
import { type HumidityType } from "./condition/humidity-type.ts";
import { type Light } from "./condition/light.ts";
import { type Packaging } from "./condition/packaging.ts";
import { type PressureType } from "./condition/pressure-type.ts";
import { type StorageCondition } from "./condition/storage-condition.ts";
import { type TemperatureType } from "./condition/temperature-type.ts";
import { economicInterestLabelKey } from "./economic-interest/label.ts";
import { type Element } from "./element/vocabulary.ts";
import { materialLabelKey } from "./material/label.ts";
import { type MetamorphicFacies } from "./metamorphic-facies/vocabulary.ts";
import { type Nature } from "./nature.ts";
import { vocabularyLabel } from "./path/vocabulary-label.ts";
import { type CollectionOrigin } from "./scientific-context/collection-origin.ts";
import { type ProvenanceStatus } from "./scientific-context/provenance-status.ts";
import { type Texture } from "./texture/vocabulary.ts";
import { sampleTypeLabelKey } from "./type/label.ts";

// The shared vocabulary catalog's keys, derived from the JSON itself (type-only
// import, erased at runtime). Domain owns the catalog, so it can type against it.
type MessageKey = keyof typeof Catalog;

// Compile-time coverage for the flat vocabularies (input is a literal union):
// a code whose translation is missing from the catalog fails to compile here,
// so it can never render a raw key to users. The tree vocabularies (material,
// type, collection method) take runtime string paths whose full key set is a
// runtime value, so they are covered by create-sample-labels.spec.ts instead.
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
type _geologicalAgeKeys = AssertKeys<`age_${GeologicalAge}`>;
type _availabilityKeys = AssertKeys<`availability_${Availability}`>;
type _elementKeys = AssertKeys<`element_${Element}`>;
type _provenanceStatusKeys =
  AssertKeys<`provenance_status_${ProvenanceStatus}`>;
type _collectionOriginKeys =
  AssertKeys<`collection_origin_${CollectionOrigin}`>;

// A message catalog: the app's compiled paraglide `m`, keyed by the catalog's
// own message keys (minus the `$`-prefixed metadata entries, e.g. `$schema`,
// which paraglide does not compile to a message). Apps pass `m` through an
// `as unknown as Messages` cast (paraglide's message functions carry input and
// metadata types this drops); this is the domain/paraglide DI seam.
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

// The sample label resolvers, bound to one app's message catalog. Paraglide
// compiles a separate `m` per app (each with its own locale strategy), so the
// binding happens per app; the resolving logic lives here, once.
export function createSampleLabels(m: Messages): SampleLabels {
  return {
    materialPathLabel: vocabularyLabel(materialLabelKey, m),
    typeLabel: vocabularyLabel(sampleTypeLabelKey, m),
    collectionMethodLabel: vocabularyLabel(collectionMethodLabelKey, m),
    economicInterestLabel: vocabularyLabel(economicInterestLabelKey, m),
    elementLabel: vocabularyLabel((element) => `element_${element}`, m),
    textureLabel: vocabularyLabel((texture) => `texture_${texture}`, m),
    metamorphicFaciesLabel: vocabularyLabel(
      (facies) => `metamorphic_facies_${facies}`,
      m,
    ),
    natureLabel: vocabularyLabel((nature) => `nature_${nature}`, m),
    packagingLabel: vocabularyLabel((packaging) => `packaging_${packaging}`, m),
    storageConditionLabel: vocabularyLabel(
      (storageCondition) => `storage_condition_${storageCondition}`,
      m,
    ),
    temperatureTypeLabel: vocabularyLabel((type) => `temperature_${type}`, m),
    humidityTypeLabel: vocabularyLabel((type) => `humidity_${type}`, m),
    lightLabel: vocabularyLabel((light) => `light_${light}`, m),
    pressureTypeLabel: vocabularyLabel((type) => `pressure_${type}`, m),
    numericUnitLabel: vocabularyLabel((unit) => `age_unit_${unit}`, m),
    yearsUnitLabel: vocabularyLabel((unit) => `age_years_${unit}`, m),
    geologicalAgeLabel: vocabularyLabel((age) => `age_${age}`, m),
    availabilityLabel: vocabularyLabel(
      (availability) => `availability_${availability}`,
      m,
    ),
    provenanceStatusLabel: vocabularyLabel(
      (status) => `provenance_status_${status}`,
      m,
    ),
    collectionOriginLabel: vocabularyLabel(
      (origin) => `collection_origin_${origin}`,
      m,
    ),
  };
}
