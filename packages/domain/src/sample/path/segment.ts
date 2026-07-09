// The last (own-name) segment of a dot-joined vocabulary path: the node's own
// code. Shared by the hierarchical vocabularies (material, type, collectionMethod).
export function pathSegment(path: string): string {
  return path.split(".").at(-1) as string;
}
