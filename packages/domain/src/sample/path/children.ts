// Direct children of a path (one segment deeper) in a flat ordered vocabulary,
// or the roots when parent is null. Matched by full path, so a segment reused
// under several parents yields the right set. Order follows the input list.
export function pathChildren(
  paths: readonly string[],
  parent: string | null,
): string[] {
  const prefix = parent === null ? "" : `${parent}.`;
  const depth = parent === null ? 0 : parent.split(".").length;
  return paths.filter(
    (path) => path.startsWith(prefix) && path.split(".").length === depth + 1,
  );
}
