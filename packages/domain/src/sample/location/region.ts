import { type TreeNode } from "../path/tree-node.ts";
import { COUNTRIES } from "./country.ts";
import { OCEAN_SEAS } from "./ocean-sea.ts";

const regionTree = {
  continent: { optional: true, choices: COUNTRIES },
  ocean: { optional: true, choices: OCEAN_SEAS },
} satisfies Record<string, TreeNode>;

type RegionSegment = keyof typeof regionTree;

export const REGION_TREE: Record<RegionSegment, TreeNode> = regionTree;

const REGION_ROOTS = Object.keys(REGION_TREE);

export const REGION_HIERARCHY = {
  roots: REGION_ROOTS,
  nodes: REGION_TREE,
};
