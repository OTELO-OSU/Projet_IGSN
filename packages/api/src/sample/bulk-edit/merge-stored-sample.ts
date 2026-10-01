import {
  clearContactLinks,
  keepContactLinks,
} from "@projet-igsn/domain/sample/contact-link";
import { parentPath } from "@projet-igsn/domain/sample/path/parent";
import {
  createSampleSchema,
  type Sample,
} from "@projet-igsn/domain/sample/sample";

import type { Column } from "../import-template/columns.ts";

import { COLUMN_KINDS } from "../import-template/column-kind.ts";
import { DATA_SHEETS } from "../import-template/columns.ts";

type Json = Record<string, unknown>;

const REGION_BLOCK = "region";

const {
  manualGroupIds: _manualGroupIds,
  parentIds: _parentIds,
  ...STORED_FIELDS
} = createSampleSchema.shape;

const writtenPath = ({ path, block }: Column): string[] => {
  if (path === undefined) return [];
  if (block === REGION_BLOCK) return [parentPath(path)];
  return [COLUMN_KINDS.get(path)?.arrayPrefix ?? path];
};

const TEMPLATE_PATHS = [
  ...new Set(
    DATA_SHEETS.flatMap(({ columns }) => columns.flatMap(writtenPath)),
  ),
].map((path) => path.split("."));

const isObject = (value: unknown): value is Json =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function omitKey(value: Json, key: string): Json {
  const { [key]: _omitted, ...kept } = value;
  return kept;
}

function without(value: Json, [key = "", ...rest]: readonly string[]): Json {
  if (!(key in value)) return value;
  if (rest.length === 0) return omitKey(value, key);
  const inner = value[key];
  if (inner === null) return omitKey(value, key);
  if (!isObject(inner)) return value;
  const pruned = without(inner, rest);
  return Object.keys(pruned).length === 0
    ? omitKey(value, key)
    : { ...value, [key]: pruned };
}

const defined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(defined);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, inner]) =>
      inner === undefined ? [] : [[key, defined(inner)]],
    ),
  );
};

const merged = (base: Json, built: Json): Json =>
  Object.entries(built).reduce<Json>((result, [key, value]) => {
    const inner = result[key];
    return {
      ...result,
      [key]: isObject(value) && isObject(inner) ? merged(inner, value) : value,
    };
  }, base);

function storedInput(sample: Sample): Json {
  const stored: Json = clearContactLinks({
    ...sample,
    relations: sample.relations.map(({ id: _id, ...relation }) => relation),
    attachments: sample.attachments.map(
      ({ id, title, targetResourceType, description }) => ({
        id,
        title,
        targetResourceType,
        description,
      }),
    ),
  });
  return Object.fromEntries(
    Object.entries(STORED_FIELDS).flatMap(([key, schema]) => {
      const parsed = schema.safeParse(stored[key]);
      const value = defined(parsed.success ? parsed.data : stored[key]);
      return value === undefined ? [] : [[key, value]];
    }),
  );
}

export function mergeStoredSample(sample: Sample, built: Json): Json {
  const untouched = TEMPLATE_PATHS.reduce(without, storedInput(sample));
  return keepContactLinks(merged(untouched, built), sample);
}
