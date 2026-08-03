import { type TreeNode } from "../../path/tree-node.ts";

// Entries for codes a published sample may still change. Absent means frozen
// (see tree-node.ts), so a childless leaf needs an entry only to carry this
// mark, and only where it opens the first editable level.
export const editableLeaves = <C extends string>(
  ...codes: C[]
): Record<C, TreeNode> =>
  Object.fromEntries(
    codes.map((code) => [code, { frozenWhenPublished: false }]),
  ) as Record<C, TreeNode>;
