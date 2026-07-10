import { pathSegment } from "../path/segment.ts";
import {
  type CollectionMethod,
  type CollectionMethodSegment,
} from "./vocabulary.ts";

// The collection-method path's own segment, used to key COLLECTION_METHOD_TREE and labels.
export function collectionMethodSegment(
  path: CollectionMethod,
): CollectionMethodSegment {
  return pathSegment(path) as CollectionMethodSegment;
}
