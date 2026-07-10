// Resolve the tree entry that defines `path` by its longest matching suffix:
// for `a.b.c` the keys `a.b.c`, `b.c`, `c` are tried in order. A dotted key
// overrides the bare segment in that context, so the same segment resolves to
// different nodes under different parents (the full path is the identity, ADR
// 0010). Returns the matched key (callers use it for cycle detection) and node.
export function resolvePathNode<N>(
  tree: Record<string, N | undefined>,
  path: string,
): { key: string; node: N } | undefined {
  const segments = path.split(".");
  for (let i = 0; i < segments.length; i++) {
    const key = segments.slice(i).join(".");
    const node = tree[key];
    if (node) return { key, node };
  }
  return undefined;
}
