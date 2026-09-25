import { boratesTree } from "./strunz-classification/borates-subtree.ts";
import { carbonatesTree } from "./strunz-classification/carbonates-subtree.ts";
import { halidesTree } from "./strunz-classification/halides-subtree.ts";
import { nativeElementsTree } from "./strunz-classification/native-elements-subtree.ts";
import { organicCompoundsTree } from "./strunz-classification/organic-compounds-subtree.ts";
import { oxidesTree } from "./strunz-classification/oxides-subtree.ts";
import { phosphatesTree } from "./strunz-classification/phosphates-subtree.ts";
import { silicatesTree } from "./strunz-classification/silicates-subtree.ts";
import { sulfatesTree } from "./strunz-classification/sulfates-subtree.ts";
import { sulfidesTree } from "./strunz-classification/sulfides-subtree.ts";
import { type StrunzMineral, type StrunzNode } from "./strunz-node.ts";

export const STRUNZ_ROOTS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
] as const;

export const STRUNZ_TREE: Record<string, StrunzNode> = {
  ...nativeElementsTree,
  ...sulfidesTree,
  ...halidesTree,
  ...oxidesTree,
  ...carbonatesTree,
  ...boratesTree,
  ...sulfatesTree,
  ...phosphatesTree,
  ...silicatesTree,
  ...organicCompoundsTree,
};

export type Mineral = StrunzMineral & { strunzId: string };

export const MINERALS: readonly Mineral[] = Object.entries(STRUNZ_TREE).flatMap(
  ([strunzId, node]) =>
    (node.minerals ?? []).map((mineral) => ({ ...mineral, strunzId })),
);
