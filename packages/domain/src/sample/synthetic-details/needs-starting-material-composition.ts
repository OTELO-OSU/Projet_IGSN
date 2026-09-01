import type { StartingMaterialNature } from "./starting-material-nature.ts";

export function needsStartingMaterialComposition(
  nature: StartingMaterialNature | null | undefined,
): boolean {
  return nature === "synthetic" || nature === "mixture";
}
