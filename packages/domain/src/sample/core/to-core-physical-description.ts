import type { Sample } from "../sample.ts";
import type { CorePhysicalDescription } from "./core-curation-schema.ts";

import { isEmpty, optionalQuantity } from "./core-optional.ts";

export function toCorePhysicalDescription(
  sample: Sample,
): CorePhysicalDescription | undefined {
  const description = sample.description;
  if (description == null) return undefined;
  const dimensions = {
    length: optionalQuantity(description.length),
    width: optionalQuantity(description.width),
    thickness: optionalQuantity(description.thickness),
  };
  const physical = {
    orientation:
      description.oriented == null
        ? undefined
        : {
            oriented: description.oriented,
            description: description.orientationExplanation ?? undefined,
          },
    openPhysicalDescription: description.openDescription ?? undefined,
    dimensions: isEmpty(dimensions) ? undefined : dimensions,
    mass: optionalQuantity(description.mass),
    volume: optionalQuantity(description.volume),
  };
  return isEmpty(physical) ? undefined : physical;
}
