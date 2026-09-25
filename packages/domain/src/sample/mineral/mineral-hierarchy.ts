import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { pathSegment } from "../path/segment.ts";
import {
  type Mineral,
  MINERALS,
  STRUNZ_ROOTS,
  STRUNZ_TREE,
} from "./strunz-classification.ts";
import { type StrunzNode } from "./strunz-node.ts";

const MINDAT_SEGMENT_PREFIX = "mindat_";

export const STRUNZ_PATHS = expandPaths(STRUNZ_TREE, STRUNZ_ROOTS);

export const strunzPathSchema = z
  .string()
  .refine((path) => STRUNZ_PATHS.includes(path));

export const STRUNZ_HIERARCHY = { roots: STRUNZ_ROOTS, nodes: STRUNZ_TREE };

const mineralSegments = (node: StrunzNode): string[] =>
  (node.minerals ?? [])
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((mineral) => `${MINDAT_SEGMENT_PREFIX}${mineral.mindatId}`);

export const MINERAL_HIERARCHY = {
  roots: STRUNZ_ROOTS,
  nodes: Object.fromEntries(
    Object.entries(STRUNZ_TREE).map(([strunzId, node]) => [
      strunzId,
      { ...node, choices: [...(node.choices ?? []), ...mineralSegments(node)] },
    ]),
  ),
};

export const mineralByMindatId: ReadonlyMap<number, Mineral> = new Map(
  MINERALS.map((mineral) => [mineral.mindatId, mineral]),
);

export const mineralOf = (mindatId: number | null | undefined) =>
  mindatId == null ? undefined : mineralByMindatId.get(mindatId);

type MineralPathParts = { strunzId: string; mindatId?: number | null };

export function toMineralPath({
  strunzId,
  mindatId,
}: MineralPathParts): string {
  return mindatId == null
    ? strunzId
    : `${strunzId}.${MINDAT_SEGMENT_PREFIX}${mindatId}`;
}

export function fromMineralPath(path: string): {
  strunzId: string;
  mindatId: number | null;
} {
  const segment = pathSegment(path);
  if (!segment.startsWith(MINDAT_SEGMENT_PREFIX)) {
    return { strunzId: path, mindatId: null };
  }
  return {
    strunzId: path.slice(0, -segment.length - 1),
    mindatId: Number(segment.slice(MINDAT_SEGMENT_PREFIX.length)),
  };
}

export function mineralClassificationText({
  strunzId,
  mindatId,
}: MineralPathParts): string {
  return mineralOf(mindatId)?.name ?? strunzId;
}

export const toMindatUri = (mindatId: number): string =>
  `https://www.mindat.org/min-${mindatId}.html`;
