// A path is a leaf when no path in the vocabulary goes deeper (nothing is
// prefixed by `${path}.`). Shared leaf rule for the flat dot-path vocabularies.
export function isPathLeaf(paths: readonly string[], path: string): boolean {
  return !paths.some((candidate) => candidate.startsWith(`${path}.`));
}
