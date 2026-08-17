import { type TreeNode } from "../../path/tree-node.ts";

export const editableLeaves = <C extends string>(
  ...codes: C[]
): Record<C, TreeNode> =>
  Object.fromEntries(
    codes.map((code) => [code, { frozenWhenPublished: false }]),
  ) as Record<C, TreeNode>;
