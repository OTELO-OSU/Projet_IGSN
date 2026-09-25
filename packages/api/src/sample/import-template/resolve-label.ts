import { pathSegment } from "@projet-igsn/domain/sample/path/segment";

import { VOCABULARY_BLOCKS } from "./vocabulary-sheet.ts";

type Codes = ReadonlyMap<string, ReadonlyMap<string, string>>;

const parentOf = (path: string) => path.split(".").slice(0, -1).join(".");

function codesOf(rows: (typeof VOCABULARY_BLOCKS)[number]["rows"]): Codes {
  const byParent = new Map<string, Map<string, string>>();
  const add = (parent: string, value: string, code: string) =>
    byParent.set(
      parent,
      (byParent.get(parent) ?? new Map<string, string>()).set(value, code),
    );
  for (const [key, , path] of rows) {
    if (path === "") add("", key, key);
    else add(parentOf(path), pathSegment(path), path);
  }
  for (const [key, label, path] of rows) {
    add(path === "" ? "" : parentOf(path), label, path === "" ? key : path);
  }
  return byParent;
}

const CODES = new Map(
  VOCABULARY_BLOCKS.map((block) => [block.id, codesOf(block.rows)]),
);

export function resolveLabel(
  blockId: string,
  parentPath: string,
  value: string,
): string | undefined {
  return CODES.get(blockId)?.get(parentPath)?.get(value);
}

export const labelOf = (blockId: string, code: string): string | undefined =>
  VOCABULARY_BLOCKS.find((block) => block.id === blockId)?.rows.find(
    ([key, , path]) => (path === "" ? key : path) === code,
  )?.[1];
