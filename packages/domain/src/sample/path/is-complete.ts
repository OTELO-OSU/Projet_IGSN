// `isOptional` encodes each vocabulary's policy: material flags per node, type
// makes none optional (must reach a leaf), collection makes all optional.
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
