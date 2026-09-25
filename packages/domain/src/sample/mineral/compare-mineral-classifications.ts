import type { MineralClassification } from "./model.ts";

import { mineralOf } from "./mineral-hierarchy.ts";

const strunzCollator = new Intl.Collator("en", { numeric: true });

const compareStrunz = (a: string, b: string) => strunzCollator.compare(a, b);

const mineralCode = (mindatId: number | null | undefined) =>
  mineralOf(mindatId)?.strunzCode ?? "";

export function compareMineralClassifications(
  a: Pick<MineralClassification, "strunzId" | "mindatId">,
  b: Pick<MineralClassification, "strunzId" | "mindatId">,
): number {
  return (
    compareStrunz(a.strunzId, b.strunzId) ||
    compareStrunz(mineralCode(a.mindatId), mineralCode(b.mindatId))
  );
}
