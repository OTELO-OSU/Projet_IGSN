import { COLLECTION_METHODS, type CollectionMethod } from "./vocabulary.ts";

// The collection-method vocabulary as one bundle for HierarchySelectField: just
// the flat paths, no canStopAt (every node is a valid stop, the component default).
export const collectionMethodHierarchy = {
  paths: COLLECTION_METHODS,
} satisfies { paths: readonly CollectionMethod[] };
