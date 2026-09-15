import type { CoreExtensions } from "./core-extensions-schema.ts";

import {
  coreNumericAgeEra,
  coreNumericAgeUnit,
  fromChronostratigraphy,
} from "./core-extensions-schema.ts";
import { orNull } from "./core-optional.ts";

export function fromCoreAge(extensions: CoreExtensions | undefined) {
  const geology = extensions?.geology;
  if (geology?.numericAge == null && geology?.chronostratigraphy == null) {
    return null;
  }
  const numericAge = geology.numericAge;
  const chronostratigraphy = geology.chronostratigraphy;
  return {
    numericAgeMin: numericAge?.min ?? null,
    numericAgeMax: numericAge?.max ?? null,
    numericAgeUnit:
      numericAge?.unit == null
        ? null
        : coreNumericAgeUnit.fromCore(numericAge.unit),
    numericAgeYearsUnit:
      numericAge?.era == null
        ? null
        : coreNumericAgeEra.fromCore(numericAge.era),
    geologicalAgeMin: orNull(chronostratigraphy?.min, fromChronostratigraphy),
    geologicalAgeMax: orNull(chronostratigraphy?.max, fromChronostratigraphy),
    geologicalUnit: chronostratigraphy?.unit ?? null,
  };
}

export function fromCoreSecurity(extensions: CoreExtensions | undefined) {
  const safety = extensions?.safety;
  if (safety == null) return null;
  return {
    radioactivity: safety.radioactivity?.flag ?? null,
    radioactivityExplanation: safety.radioactivity?.explanation ?? null,
    asbestosRich: safety.asbestos?.flag ?? null,
    asbestosExplanation: safety.asbestos?.explanation ?? null,
    chemicalRisk: safety.chemical?.flag ?? null,
    chemicalRiskExplanation: safety.chemical?.explanation ?? null,
  };
}
