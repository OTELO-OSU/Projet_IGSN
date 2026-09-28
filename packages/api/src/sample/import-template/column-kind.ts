import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { z } from "zod";

type ColumnKind = {
  type: "string" | "number" | "boolean" | "other";
  arrayPrefix?: string;
};

type JsonSchema = z.core.JSONSchema.BaseSchema;

function leafType({ type }: JsonSchema): ColumnKind["type"] {
  const name = [type].flat().find((candidate) => candidate !== "null");
  if (name === "string" || name === "boolean") return name;
  return name === "number" || name === "integer" ? "number" : "other";
}

function kindsOf(
  subschema: JsonSchema | boolean,
  path: string,
  arrayPrefix?: string,
): [string, ColumnKind][] {
  const schema = typeof subschema === "boolean" ? {} : subschema;
  if (schema.properties)
    return Object.entries(schema.properties).flatMap(([key, inner]) =>
      kindsOf(inner, path === "" ? key : `${path}.${key}`, arrayPrefix),
    );
  const options = schema.anyOf ?? schema.oneOf;
  if (options)
    return options
      .filter((option) => option.type !== "null")
      .flatMap((option) => kindsOf(option, path, arrayPrefix));
  if (schema.items)
    return [schema.items].flat().flatMap((item) => kindsOf(item, path, path));
  const type = leafType(schema);
  return [[path, arrayPrefix === undefined ? { type } : { type, arrayPrefix }]];
}

export const COLUMN_KINDS: ReadonlyMap<string, ColumnKind> = new Map(
  kindsOf(z.toJSONSchema(createSampleSchema, { io: "input" }), "").reverse(),
);
