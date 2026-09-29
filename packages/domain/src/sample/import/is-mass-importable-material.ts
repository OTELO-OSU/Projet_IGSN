import { allowsMineralClassifications } from "../mineral/allows-mineral-classifications.ts";
import { isSyntheticMaterial } from "../synthetic-details/is-synthetic-material.ts";

export function isMassImportableMaterial(path: string): boolean {
  return !isSyntheticMaterial(path) && !allowsMineralClassifications(path);
}
