import { resolvePathNode } from "../src/sample/path/resolve-node.ts";

export function unresolvedEntries(
  tree: Record<string, unknown>,
  paths: readonly string[],
): string[] {
  return Object.keys(tree).filter(
    (key) => !paths.some((path) => resolvePathNode(tree, path)?.key === key),
  );
}
