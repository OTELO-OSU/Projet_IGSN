import { z } from "zod";

import type { CoreSample } from "./core-sample-schema.ts";

import { FRONTEND_URL } from "./core-record-fixture.ts";
import { coreSampleSchema } from "./core-sample-schema.ts";
import { toCoreSample } from "./to-core-sample.ts";

const isOptional = (schema: z.ZodType): schema is z.ZodOptional<z.ZodType> =>
  schema instanceof z.ZodOptional;

const isArray = (schema: z.ZodType): schema is z.ZodArray<z.ZodType> =>
  schema instanceof z.ZodArray;

const unwrap = (schema: z.ZodType): z.ZodType => {
  if (isOptional(schema)) return unwrap(schema.unwrap());
  if (isArray(schema)) return unwrap(schema.element);
  return schema;
};

/** Every Core field as `section.field`, for a mapping spec to hold as projected or dropped. */
export const corePaths = (): string[] =>
  Object.entries(coreSampleSchema.shape).flatMap(([name, field]) => {
    const inner = unwrap(field);
    return inner instanceof z.ZodObject
      ? Object.keys(inner.shape).map((child) => `${name}.${child}`)
      : [name];
  });

export const core = (sample: Parameters<typeof toCoreSample>[0]): CoreSample =>
  toCoreSample(sample, FRONTEND_URL);
