import { resolvePathNode } from "./resolve-node.ts";
import { type TreeNode } from "./tree-node.ts";

export function isOptionalAtOrAbove(
  nodes: Record<string, TreeNode | undefined>,
  path: string,
): boolean {
  const segments = path.split(".");
  return segments.some(
    (_, depth) =>
      resolvePathNode(nodes, segments.slice(0, depth + 1).join("."))?.node
        .optional === true,
  );
}
