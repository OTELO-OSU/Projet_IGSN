import { parentPath } from "@projet-igsn/domain/sample/path/parent";
import { pathSegment } from "@projet-igsn/domain/sample/path/segment";

import { VOCABULARY_BLOCKS } from "./vocabulary-sheet.ts";

type Codes = ReadonlyMap<string, ReadonlyMap<string, string>>;

function codesOf(rows: (typeof VOCABULARY_BLOCKS)[number]["rows"]): Codes {
  const byParent = new Map<string, Map<string, string>>();
  const add = (parent: string, value: string, code: string) =>
    byParent.set(
      parent,
      (byParent.get(parent) ?? new Map<string, string>()).set(value, code),
    );
  for (const [key, , path] of rows) {
    if (path === "") add("", key, key);
    else add(parentPath(path), pathSegment(path), path);
  }
  for (const [key, label, path] of rows)
    add(parentPath(path), label, path || key);
  return byParent;
}

const rowsOf = (block: (typeof VOCABULARY_BLOCKS)[number]) => [
  ...(block.retiredRows ?? []),
  ...block.rows,
];

const CODES = new Map(
  VOCABULARY_BLOCKS.map((block) => [block.id, codesOf(rowsOf(block))]),
);

const LABELS = new Map(
  VOCABULARY_BLOCKS.map((block) => [
    block.id,
    new Map(rowsOf(block).map(([key, label, path]) => [path || key, label])),
  ]),
);

export function resolveLabel(
  blockId: string,
  parent: string,
  value: string,
): string | undefined {
  return CODES.get(blockId)?.get(parent)?.get(value);
}

export const labelOf = (blockId: string, code: string): string | undefined =>
  LABELS.get(blockId)?.get(code);
