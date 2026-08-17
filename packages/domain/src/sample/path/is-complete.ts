export function isPathComplete(
  paths: readonly string[],
  path: string,
  isOptional: (path: string) => boolean,
): boolean {
  return (
    !paths.some((candidate) => candidate.startsWith(`${path}.`)) ||
    isOptional(path)
  );
}
