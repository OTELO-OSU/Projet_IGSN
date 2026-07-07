import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import {
  type CollectionMethodNode,
  buildCollectionMethodTree,
} from "@projet-igsn/domain/sample/collection-method-tree";

import { m } from "#/paraglide/messages.js";
import { collectionMethodLabel } from "#/samples/collection-method-label.ts";

const COLLECTION_METHOD_TREE = buildCollectionMethodTree();

// The form holds one path per level (the full ltree path picked at that level);
// the domain value is the deepest one picked. Selecting a level's own "no
// sub-type" option keeps that level's path, so it composes to the parent.
export function composeCollectionMethod(path: string[]): string | null {
  return path.filter(Boolean).at(-1) ?? null;
}

// Split a stored path into the per-level selections that prefill the walk:
// "coring.gravity_corer.giant" -> ["coring", "coring.gravity_corer", "coring.gravity_corer.giant"].
export function toCollectionMethodPath(method: string | null): string[] {
  if (!method) return [];
  const segments = method.split(".");
  return segments.map((_, index) => segments.slice(0, index + 1).join("."));
}

type CollectionMethodLevelProps = {
  depth: number;
  // The selected parent node whose children this level offers; null at the root.
  parent: CollectionMethodNode | null;
  label: string;
};

function CollectionMethodLevel({
  depth,
  parent,
  label,
}: CollectionMethodLevelProps) {
  const form = useTypedAppFormContext({
    defaultValues: { collectionMethodPath: [] as string[] },
  });
  const nodes = parent ? parent.children : COLLECTION_METHOD_TREE;
  if (nodes.length === 0) return null; // Leaf: nothing left to refine.

  const items = [
    // Selecting the parent itself means "no sub-type": it composes to the
    // parent path and stops the walk. Absent at the root (no parent to keep).
    ...(parent
      ? [{ value: parent.path, label: collectionMethodLabel(parent.path) }]
      : []),
    ...nodes.map((node) => ({
      value: node.path,
      label: collectionMethodLabel(node.path),
    })),
  ];

  return (
    <>
      <form.AppField
        name={`collectionMethodPath[${depth}]`}
        listeners={{
          // A new choice at this level invalidates every deeper level.
          onChange: () =>
            form.setFieldValue("collectionMethodPath", (path) =>
              path.slice(0, depth + 1),
            ),
        }}
      >
        {(field) => (
          <field.ComboboxField
            label={label}
            items={items}
            placeholder={m.collection_method_placeholder()}
            searchPlaceholder={m.collection_method_search_placeholder()}
            emptyText={m.collection_method_empty()}
          />
        )}
      </form.AppField>

      <form.Subscribe
        selector={(state) => state.values.collectionMethodPath[depth]}
      >
        {(selected) => {
          const child = nodes.find((node) => node.path === selected);
          // The parent-itself option is not a child, so it stops the recursion.
          return child ? (
            <CollectionMethodLevel
              depth={depth + 1}
              parent={child}
              label={collectionMethodLabel(child.path)}
            />
          ) : null;
        }}
      </form.Subscribe>
    </>
  );
}

export function CollectionMethodField() {
  return (
    <CollectionMethodLevel
      depth={0}
      parent={null}
      label={m.field_collection_method()}
    />
  );
}
