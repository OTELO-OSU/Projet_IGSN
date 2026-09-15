import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";
import { pathSegment } from "../path/segment.ts";

export function conceptShape<S extends string>(scheme: S) {
  return {
    label: z.string().min(1),
    schemeName: z.literal(`otelo:${scheme}`),
    schemeURI: z.literal(`urn:otelo:vocabulary:${scheme}`),
  };
}

export function conceptSchema<S extends string, T extends z.ZodType>(
  scheme: S,
  id: T,
) {
  return z.strictObject({
    id,
    ...conceptShape(scheme),
    notation: freeTextSchema.optional(),
  });
}

export function toConcept<
  S extends string,
  I extends string,
  N extends string | undefined = undefined,
>(
  scheme: S,
  id: I,
  notation?: N,
): {
  id: I;
  label: string;
  schemeName: `otelo:${S}`;
  schemeURI: `urn:otelo:vocabulary:${S}`;
  notation: N;
} {
  return {
    id,
    label: pathSegment(id),
    schemeName: `otelo:${scheme}`,
    schemeURI: `urn:otelo:vocabulary:${scheme}`,
    notation: notation as N,
  };
}
