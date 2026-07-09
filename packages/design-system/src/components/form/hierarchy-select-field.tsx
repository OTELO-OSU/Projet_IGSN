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

type HierarchySelectFieldProps<T extends string> = {
  // Form field holding the per-level path (a string[]); must exist in the
  // parent form's defaultValues.
  name: string;
  // Flat controlled vocabulary of dot-separated paths.
  choices: readonly T[];
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
  "choices" | "rootLabel"
> & {
  // The nodes offered at this level: the tree roots at depth 0, then the
  // selected parent's children.
  nodes: HierarchyNode<T>[];
  depth: number;
  // The selected parent node whose children this level offers; null at the root.
  parent: HierarchyNode<T> | null;
  label: string;
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
}: HierarchyLevelProps<T>) {
  const form = useTypedAppFormContext({
    defaultValues: {} as Record<string, string[]>,
  });
  if (nodes.length === 0) return null; // Leaf: nothing left to refine.

  const items = [
    // The parent-itself option means "no further refinement"; it composes to
    // the parent path and stops the walk. Absent at the root.
    ...(parent ? [{ value: parent.path, label: getLabel(parent.path) }] : []),
    ...nodes.map((node) => ({ value: node.path, label: getLabel(node.path) })),
  ];

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
            label={label}
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
  choices,
  rootLabel,
  ...rest
}: HierarchySelectFieldProps<T>) {
  return (
    <HierarchyLevel
      {...rest}
      nodes={buildHierarchyTree(choices)}
      depth={0}
      parent={null}
      label={rootLabel}
    />
  );
}
