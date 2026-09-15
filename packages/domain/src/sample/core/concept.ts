import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";
import { pathSegment } from "../path/segment.ts";

export function conceptShape<S extends string>(scheme: S) {
  return {
    label: z.string().min(1).meta({
      description:
        "Leaf segment of the id, ignored on input since the reverse mapping reads the id alone.",
    }),
    schemeName: z.literal(`otelo:${scheme}`).meta({
      description: "OTELo vocabulary the id belongs to.",
    }),
    schemeURI: z.literal(`urn:otelo:vocabulary:${scheme}`).meta({
      description: "Constant URN naming that vocabulary.",
    }),
  };
}

export function conceptSchema<S extends string, T extends z.ZodType>(
  scheme: S,
  id: T,
) {
  return z.strictObject({
    id: id.meta({
      description:
        "Our code or dot path for this concept, validated against the vocabulary named by schemeName.",
    }),
    ...conceptShape(scheme),
    notation: freeTextSchema
      .meta({
        description:
          "Qualifier telling two concepts of the same vocabulary apart, one concept per scheme and notation pair at most.",
      })
      .optional(),
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
