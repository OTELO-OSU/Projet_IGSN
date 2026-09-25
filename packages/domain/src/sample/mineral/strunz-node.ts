import { type TreeNode } from "../path/tree-node.ts";

export type StrunzMineral = {
  mindatId: number;
  name: string;
  strunzCode: string;
};

export type StrunzNode = TreeNode & { minerals?: readonly StrunzMineral[] };
