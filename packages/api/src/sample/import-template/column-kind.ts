import type { z } from "zod";

import { createSampleSchema } from "@projet-igsn/domain/sample/sample";

export type ColumnKind = {
  type: "string" | "number" | "boolean" | "other";
  arrayPrefix?: string;
};

type SchemaDefinition = {
  type: string;
  innerType?: z.ZodType;
  in?: z.ZodType;
  shape?: Record<string, z.ZodType>;
  options?: readonly z.ZodType[];
  element?: z.ZodType;
  values?: readonly unknown[];
};

const WRAPPERS = new Set([
  "optional",
  "nullable",
  "default",
  "prefault",
  "nonoptional",
  "readonly",
  "catch",
]);

const definitionOf = (schema: z.ZodType): SchemaDefinition =>
  (schema as unknown as { _zod: { def: SchemaDefinition } })._zod.def;

function leafType({ type, values }: SchemaDefinition): ColumnKind["type"] {
  if (type === "string" || type === "enum") return "string";
  if (type === "number" || type === "boolean") return type;
  if (type === "literal")
    return values?.every((value) => typeof value === "number")
      ? "number"
      : "string";
  return "other";
}

function kindsOf(
  schema: z.ZodType,
  path: string,
  arrayPrefix?: string,
): [string, ColumnKind][] {
  const definition = definitionOf(schema);
  if (definition.innerType && WRAPPERS.has(definition.type))
    return kindsOf(definition.innerType, path, arrayPrefix);
  if (definition.type === "pipe" && definition.in)
    return kindsOf(definition.in, path, arrayPrefix);
  if (definition.type === "object" && definition.shape)
    return Object.entries(definition.shape).flatMap(([key, value]) =>
      kindsOf(value, path === "" ? key : `${path}.${key}`, arrayPrefix),
    );
  if (definition.type === "union" && definition.options)
    return definition.options.flatMap((option) =>
      kindsOf(option, path, arrayPrefix),
    );
  if (definition.type === "array" && definition.element)
    return kindsOf(definition.element, path, path);
  const type = leafType(definition);
  return [[path, arrayPrefix === undefined ? { type } : { type, arrayPrefix }]];
}

export const COLUMN_KINDS: ReadonlyMap<string, ColumnKind> = new Map(
  kindsOf(createSampleSchema, "").reverse(),
);
