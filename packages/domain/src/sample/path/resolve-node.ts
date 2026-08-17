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
