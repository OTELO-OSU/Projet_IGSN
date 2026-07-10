import { useTypedAppFormContext } from "./app-form.tsx";

export type HierarchyNode<T extends string> = {
  path: T;
  children: HierarchyNode<T>[];
};

// Materialize a flat list of dot-separated paths (e.g. "coring.gravity_corer")
// into a nested tree. Assumes a parent path is listed before its children, as
// controlled vocabularies are.
export function buildHierarchyTree<T extends string>(
  choices: readonly T[],
): HierarchyNode<T>[] {
  const roots: HierarchyNode<T>[] = [];
  const byPath = new Map<string, HierarchyNode<T>>();
  for (const path of choices) {
    const node: HierarchyNode<T> = { path, children: [] };
    byPath.set(path, node);
    const dot = path.lastIndexOf(".");
    if (dot === -1) {
      roots.push(node);
    } else {
      byPath.get(path.slice(0, dot))?.children.push(node);
    }
  }
  return roots;
}

// The options offered at a level: the parent-itself "stop here" option (only
// when stopping at the parent is allowed) followed by the child nodes. The
// parent option composes to the parent path; a vocabulary that forbids stopping
// at an ancestor (sample type must reach a leaf) omits it via canStopAt.
//
// When the vocabulary already models "stop here" as an explicit self-child
// (e.g. `coring.coring`), that child IS the stop option, so the synthetic
// parent option is dropped to avoid showing the same label twice.
export function hierarchyLevelItems<T extends string>(
  parent: HierarchyNode<T> | null,
  nodes: HierarchyNode<T>[],
  getLabel: (path: T) => string,
  canStopAt: (path: T) => boolean,
): { value: T; label: string }[] {
  const parentSegment = parent?.path.split(".").at(-1);
  const hasSelfChild = nodes.some(
    (node) => node.path.split(".").at(-1) === parentSegment,
  );
  return [
    ...(parent && canStopAt(parent.path) && !hasSelfChild
      ? [{ value: parent.path, label: getLabel(parent.path) }]
      : []),
    ...nodes.map((node) => ({ value: node.path, label: getLabel(node.path) })),
  ];
}

// A nested level is required (must be refined) when its parent is not a valid
// stopping point, so it carries the ` *` marker. The root level owns its marker
// via the caller's rootLabel (parent is null).
export function levelLabel<T extends string>(
  label: string,
  parent: HierarchyNode<T> | null,
  canStopAt: (path: T) => boolean,
): string {
  return parent && !canStopAt(parent.path) ? `${label} *` : label;
}

// The field holds one value per level (the full path picked at that level); the
// chosen value is the deepest one. Picking a level's own option keeps the parent
// path, so it composes to that ancestor.
export function composeHierarchyValue(path: string[]): string | null {
  return path.filter(Boolean).at(-1) ?? null;
}

// Split a stored path into the per-level selections that prefill the walk:
// "a.b.c" -> ["a", "a.b", "a.b.c"].
export function toHierarchyPath(value: string | null): string[] {
  if (!value) return [];
  const segments = value.split(".");
  return segments.map((_, index) => segments.slice(0, index + 1).join("."));
}

// A vocabulary as one bundle: its flat paths and, optionally, its completeness
// policy. Composed in `domain` per vocabulary (material, type, collection method).
export type Hierarchy<T extends string> = {
  // Flat controlled vocabulary of dot-separated paths.
  paths: readonly T[];
  // Whether stopping at a given path is a valid choice; drives whether a level
  // offers its parent as a "no further refinement" option. Defaults to always
  // allowed (collection method); sample type passes its leaf-only policy.
  canStopAt?: (path: T) => boolean;
};

type HierarchySelectFieldProps<T extends string> = {
  // Form field holding the per-level path (a string[]); must exist in the
  // parent form's defaultValues.
  name: string;
  // The vocabulary's paths and completeness policy (see Hierarchy).
  hierarchy: Hierarchy<T>;
  // Resolves a path to its (translated) label; owned by the calling package.
  getLabel: (path: T) => string;
  // Label of the first level; deeper levels are labelled by their parent's value.
  rootLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
};

type HierarchyLevelProps<T extends string> = Omit<
  HierarchySelectFieldProps<T>,
  "hierarchy" | "rootLabel"
> & {
  // The nodes offered at this level: the tree roots at depth 0, then the
  // selected parent's children.
  nodes: HierarchyNode<T>[];
  depth: number;
  // The selected parent node whose children this level offers; null at the root.
  parent: HierarchyNode<T> | null;
  label: string;
  canStopAt: (path: T) => boolean;
};

function HierarchyLevel<T extends string>({
  name,
  getLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  nodes,
  depth,
  parent,
  label,
  canStopAt,
}: HierarchyLevelProps<T>) {
  const form = useTypedAppFormContext({
    defaultValues: {} as Record<string, string[]>,
  });
  if (nodes.length === 0) return null; // Leaf: nothing left to refine.

  const items = hierarchyLevelItems(parent, nodes, getLabel, canStopAt);

  return (
    <>
      <form.AppField
        name={`${name}[${depth}]`}
        listeners={{
          // A new choice at this level invalidates every deeper level.
          onChange: () =>
            form.setFieldValue(name, (path) => path.slice(0, depth + 1)),
        }}
      >
        {(field) => (
          <field.ComboboxField
            label={levelLabel(label, parent, canStopAt)}
            items={items}
            placeholder={placeholder}
            searchPlaceholder={searchPlaceholder}
            emptyText={emptyText}
          />
        )}
      </form.AppField>

      <form.Subscribe selector={(state) => state.values[name]?.[depth]}>
        {(selected) => {
          const child = nodes.find((node) => node.path === selected);
          // The parent-itself option is not a child, so it stops the recursion.
          return child ? (
            <HierarchyLevel
              name={name}
              getLabel={getLabel}
              placeholder={placeholder}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
              nodes={child.children}
              depth={depth + 1}
              parent={child}
              label={getLabel(child.path)}
              canStopAt={canStopAt}
            />
          ) : null;
        }}
      </form.Subscribe>
    </>
  );
}

// A cascade of autocompletes over a hierarchical controlled vocabulary: one
// select per level, each labelled by the value picked above it, walking the tree
// recursively as deep as the taxonomy goes. Render inside a `form.AppForm`.
export function HierarchySelectField<T extends string>({
  hierarchy,
  rootLabel,
  ...rest
}: HierarchySelectFieldProps<T>) {
  return (
    <HierarchyLevel
      {...rest}
      canStopAt={hierarchy.canStopAt ?? (() => true)}
      nodes={buildHierarchyTree(hierarchy.paths)}
      depth={0}
      parent={null}
      label={rootLabel}
    />
  );
}
