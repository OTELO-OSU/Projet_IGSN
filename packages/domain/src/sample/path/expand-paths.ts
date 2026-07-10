import { resolvePathNode } from "./resolve-node.ts";
import { type TreeNode } from "./tree-node.ts";

// Expands a segment-keyed tree into the flat list of dot-joined paths, emitting
// every node (an ancestor path is a valid partial classification). Order follows
// roots then each node's `choices`, giving callers a stable UI order.
//
// Each node is resolved by the longest matching suffix of its path (see
// resolvePathNode): a bare key is the default definition; a dotted key overrides
// it in that context (e.g. `core.core` is a childless leaf even though bare
// `core` has children). A resolved key repeating within one branch is a cycle
// with no terminal override, and throws instead of looping forever.
export function expandPaths(
  tree: Record<string, Pick<TreeNode, "choices"> | undefined>,
  roots: readonly string[],
): string[] {
  const walk = (path: string, ancestorKeys: readonly string[]): string[] => {
    const match = resolvePathNode(tree, path);
    if (match && ancestorKeys.includes(match.key)) {
      throw new Error(
        `Path tree cycle: ${[...ancestorKeys, match.key].join(" -> ")}`,
      );
    }
    const nextAncestors = match ? [...ancestorKeys, match.key] : ancestorKeys;
    return [
      path,
      ...(match?.node.choices ?? []).flatMap((child) =>
        walk(`${path}.${child}`, nextAncestors),
      ),
    ];
  };
  return roots.flatMap((root) => walk(root, []));
}
