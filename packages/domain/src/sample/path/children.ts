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
