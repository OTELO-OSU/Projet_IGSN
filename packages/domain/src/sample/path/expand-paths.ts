import { resolvePathNode } from "./resolve-node.ts";
import { type TreeNode } from "./tree-node.ts";

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
