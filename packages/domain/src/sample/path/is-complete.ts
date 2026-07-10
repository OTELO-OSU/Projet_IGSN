import { isPathLeaf } from "./is-leaf.ts";

// A path is complete (a valid stop) when it is a leaf or its node is optional.
// `isOptional` encodes each vocabulary's policy: material flags per node, type
// makes none optional (must reach a leaf), collection makes all optional.
export function isPathComplete(
  paths: readonly string[],
  path: string,
  isOptional: (path: string) => boolean,
): boolean {
  return isPathLeaf(paths, path) || isOptional(path);
}
