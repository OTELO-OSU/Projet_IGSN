import { hierarchyLevelItems } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { COLLECTION_METHOD_HIERARCHY } from "@projet-igsn/domain/sample/collection-method/vocabulary";

import type { TreeFilterNode } from "#/filters/tree-filter-node.ts";

import { collectionMethodLabel } from "#/samples/sample-labels.ts";

function nodesUnder(parent: string | null): TreeFilterNode[] {
  return hierarchyLevelItems(
    COLLECTION_METHOD_HIERARCHY,
    parent,
    collectionMethodLabel,
  ).map(({ value, label }) => ({
    key: value,
    label,
    value,
    children: nodesUnder(value),
  }));
}

export const COLLECTION_METHOD_TREE = nodesUnder(null);
