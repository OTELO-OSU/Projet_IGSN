import { resolvePathNode } from "../src/sample/path/resolve-node.ts";

// Tree entries that no path resolves to. An undefined segment defaults to a
// childless leaf, so a mistyped entry key would silently drop its choices;
// each vocabulary spec asserts this list is empty.
export function unresolvedEntries(
  tree: Record<string, unknown>,
  paths: readonly string[],
): string[] {
  return Object.keys(tree).filter(
    (key) => !paths.some((path) => resolvePathNode(tree, path)?.key === key),
  );
}
