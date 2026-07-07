import {
  type CollectionMethod,
  COLLECTION_METHODS,
} from "./collection-method.ts";

// The vocabulary is a flat list of dot-separated paths; materialize it as a
// nested tree so the form can walk it recursively, one autocomplete per level.
export type CollectionMethodNode = {
  path: CollectionMethod;
  children: CollectionMethodNode[];
};

export function buildCollectionMethodTree(): CollectionMethodNode[] {
  const roots: CollectionMethodNode[] = [];
  const byPath = new Map<string, CollectionMethodNode>();
  for (const path of COLLECTION_METHODS) {
    const node: CollectionMethodNode = { path, children: [] };
    byPath.set(path, node);
    const dot = path.lastIndexOf(".");
    if (dot === -1) {
      roots.push(node);
    } else {
      // Parent declared before its children, so it is already in the map.
      byPath.get(path.slice(0, dot))?.children.push(node);
    }
  }
  return roots;
}
