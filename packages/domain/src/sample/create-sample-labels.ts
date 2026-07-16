import type Catalog from "../../messages/en.json";

import { type GeologicalAge } from "./age/geological-age.ts";
import { type NumericUnit } from "./age/numeric-unit.ts";
import { type YearsUnit } from "./age/years-unit.ts";
import { collectionMethodLabelKey } from "./collection-method/label.ts";
import { materialLabelKey } from "./material/label.ts";
import { type MetamorphicFacies } from "./metamorphic-facies/vocabulary.ts";
import { type Nature } from "./nature.ts";
import { vocabularyLabel } from "./path/vocabulary-label.ts";
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
type _numericUnitKeys = AssertKeys<`age_unit_${NumericUnit}`>;
type _yearsUnitKeys = AssertKeys<`age_years_${YearsUnit}`>;
type _geologicalAgeKeys = AssertKeys<`age_${GeologicalAge}`>;

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
  textureLabel: (texture: Texture) => string;
  metamorphicFaciesLabel: (facies: MetamorphicFacies) => string;
  natureLabel: (nature: Nature) => string;
  numericUnitLabel: (unit: NumericUnit) => string;
  yearsUnitLabel: (unit: YearsUnit) => string;
  geologicalAgeLabel: (age: GeologicalAge) => string;
};

// The sample label resolvers, bound to one app's message catalog. Paraglide
// compiles a separate `m` per app (each with its own locale strategy), so the
// binding happens per app; the resolving logic lives here, once.
export function createSampleLabels(m: Messages): SampleLabels {
  return {
    materialPathLabel: vocabularyLabel(materialLabelKey, m),
    typeLabel: vocabularyLabel(sampleTypeLabelKey, m),
    collectionMethodLabel: vocabularyLabel(collectionMethodLabelKey, m),
    textureLabel: vocabularyLabel((texture) => `texture_${texture}`, m),
    metamorphicFaciesLabel: vocabularyLabel(
      (facies) => `metamorphic_facies_${facies}`,
      m,
    ),
    natureLabel: vocabularyLabel((nature) => `nature_${nature}`, m),
    numericUnitLabel: vocabularyLabel((unit) => `age_unit_${unit}`, m),
    yearsUnitLabel: vocabularyLabel((unit) => `age_years_${unit}`, m),
    geologicalAgeLabel: vocabularyLabel((age) => `age_${age}`, m),
  };
}
