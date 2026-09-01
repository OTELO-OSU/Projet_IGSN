import type { StartingMaterial } from "./starting-material.ts";

export function needsStartingMaterialComposition(
  startingMaterial: StartingMaterial | null | undefined,
): boolean {
  return startingMaterial === "synthetic" || startingMaterial === "mixture";
}
