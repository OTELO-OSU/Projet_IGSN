import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

const MINERAL_MATERIAL_ROOT = "rock_and_sediment.mineral";

export function allowsMineralClassifications(
  material: string | null | undefined,
): boolean {
  return isPathAtOrUnder(material, MINERAL_MATERIAL_ROOT);
}
