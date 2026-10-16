import type { MineralAbundance } from "@projet-igsn/domain/sample/mineral/model";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/lib/hierarchy";
import { allowsMineralClassifications } from "@projet-igsn/domain/sample/mineral/allows-mineral-classifications";
import {
  fromMineralPath,
  toMineralPath,
} from "@projet-igsn/domain/sample/mineral/mineral-hierarchy";

export type MineralClassificationDraft = {
  key: string;
  path: string[];
  abundance: MineralAbundance | undefined;
};

export const toMineralClassificationDrafts = (
  rows: CreateSample["mineralClassifications"],
): MineralClassificationDraft[] =>
  rows?.length
    ? rows.map((row) => ({
        key: crypto.randomUUID(),
        path: toHierarchyPath(toMineralPath(row)),
        abundance: row.abundance ?? undefined,
      }))
    : [{ key: crypto.randomUUID(), path: [], abundance: undefined }];

export const isUnclassified = ([
  first,
  ...rest
]: MineralClassificationDraft[]) =>
  rest.length === 0 &&
  first !== undefined &&
  first.path.length === 0 &&
  first.abundance === undefined;

export const composeMineralClassifications = (
  rows: MineralClassificationDraft[],
  material: string | null,
) =>
  allowsMineralClassifications(material) && !isUnclassified(rows)
    ? rows.map(({ path, abundance }) => {
        const value = composeHierarchyValue(path);
        return { ...(value === null ? {} : fromMineralPath(value)), abundance };
      })
    : [];
