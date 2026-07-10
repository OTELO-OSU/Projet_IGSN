import { pathLabelKey } from "../path/label-key.ts";
import { type CollectionMethod } from "./vocabulary.ts";

// The i18n message key for a collection-method node (see pathLabelKey), e.g.
// `collection_method_coring`.
export function collectionMethodLabelKey(method: CollectionMethod): string {
  return pathLabelKey("collection_method", method);
}
