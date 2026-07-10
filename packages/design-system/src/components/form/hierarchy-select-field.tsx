import { useTypedAppFormContext } from "./app-form.tsx";

// Structural mirror of the domain vocabulary trees (design-system MUST NOT
// import domain). `label` is the node's own code; the widget renders it through
// its `translate` prop. A node with children must be refined unless marked
// `optional: true` (the only valid non-leaf stop); `choices` lists the child
// segment codes.
export type HierarchyNodeDef = {
  label: string;
  optional?: boolean;
  choices?: readonly string[];
};

// A hierarchical vocabulary as one self-describing bundle: its entry segments
// and its segment-keyed nodes, where a dotted key overrides the bare segment in
// that context (the full path is the identity, ADR 0010).
export type Hierarchy = {
  roots: readonly string[];
  nodes: Record<string, HierarchyNodeDef | undefined>;
};

// Resolve the node defining `path` by its longest matching suffix: for `a.b.c`
// the keys `a.b.c`, `b.c`, `c` are tried in order. Same convention as domain's
// resolvePathNode, deliberately reimplemented (no domain import here). Trees
// are proven acyclic upstream (domain expandPaths throws on cycles at import).
function resolveNode(
  hierarchy: Hierarchy,
  path: string,
): HierarchyNodeDef | undefined {
  const segments = path.split(".");
  for (let i = 0; i < segments.length; i++) {
    const node = hierarchy.nodes[segments.slice(i).join(".")];
    if (node) return node;
  }
  return undefined;
}

const identity = (code: string) => code;

// The label of a path: its node's label code run through the caller's
// translation. Node-resolved, so a dotted override key can label its occurrence
// differently from the bare segment.
export function hierarchyPathLabel(
  hierarchy: Hierarchy,
  path: string,
  translate: (code: string) => string = identity,
): string {
  return translate(resolveNode(hierarchy, path)?.label ?? path);
}

// The paths offered under `parent`: the roots at the top level (null parent),
// then the parent node's choices composed onto its path.
export function hierarchyChildren(
  hierarchy: Hierarchy,
  parent: string | null,
): string[] {
  if (parent === null) return [...hierarchy.roots];
  const choices = resolveNode(hierarchy, parent)?.choices ?? [];
  return choices.map((segment) => `${parent}.${segment}`);
}

// A path is a valid stop when it has nothing left to refine (leaf) or its node
// is marked optional. Exported so consumers can prove the widget's stop options
// match their own completeness policy.
export function canStopAtPath(hierarchy: Hierarchy, path: string): boolean {
  const node = resolveNode(hierarchy, path);
  return !node?.choices?.length || node.optional === true;
}

// The options offered at a level: the parent-itself "stop here" option (only
// when stopping at the parent is allowed) followed by the children. The parent
// option composes to the parent path.
//
// When the vocabulary already models "stop here" as an explicit self-child
// (e.g. `coring.coring`), that child IS the stop option, so the synthetic
// parent option is dropped to avoid showing the same label twice.
export function hierarchyLevelItems(
  hierarchy: Hierarchy,
  parent: string | null,
  translate: (code: string) => string = identity,
): { value: string; label: string }[] {
  const children = hierarchyChildren(hierarchy, parent);
  const parentSegment = parent?.split(".").at(-1);
  const hasSelfChild = children.some(
    (child) => child.split(".").at(-1) === parentSegment,
  );
  const item = (path: string) => ({
    value: path,
    label: hierarchyPathLabel(hierarchy, path, translate),
  });
  return [
    ...(parent && canStopAtPath(hierarchy, parent) && !hasSelfChild
      ? [item(parent)]
      : []),
    ...children.map(item),
  ];
}

// A nested level is required (must be refined) when its parent is not a valid
// stopping point, so it carries the ` *` marker. The root level owns its marker
// via the caller's rootLabel (parent is null).
export function levelLabel(
  hierarchy: Hierarchy,
  label: string,
  parent: string | null,
): string {
  return parent && !canStopAtPath(hierarchy, parent) ? `${label} *` : label;
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

type HierarchySelectFieldProps = {
  // Form field holding the per-level path (a string[]); must exist in the
  // parent form's defaultValues.
  name: string;
  // The vocabulary tree; choices, labels, and stop-ability all derive from it.
  hierarchy: Hierarchy;
  // Translates a node's label code; owned by the calling package (i18n rule).
  // Defaults to rendering the raw code.
  translate?: (code: string) => string;
  // Label of the first level; deeper levels are labelled by their parent's value.
  rootLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
};

type HierarchyLevelProps = Omit<HierarchySelectFieldProps, "rootLabel"> & {
  depth: number;
  // The selected path whose children this level offers; null at the root.
  parent: string | null;
  label: string;
};

function HierarchyLevel({
  name,
  hierarchy,
  translate = identity,
  placeholder,
  searchPlaceholder,
  emptyText,
  depth,
  parent,
  label,
}: HierarchyLevelProps) {
  const form = useTypedAppFormContext({
    defaultValues: {} as Record<string, string[]>,
  });
  const children = hierarchyChildren(hierarchy, parent);
  if (children.length === 0) return null; // Leaf: nothing left to refine.

  const items = hierarchyLevelItems(hierarchy, parent, translate);

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
            label={levelLabel(hierarchy, label, parent)}
            items={items}
            placeholder={placeholder}
            searchPlaceholder={searchPlaceholder}
            emptyText={emptyText}
          />
        )}
      </form.AppField>

      <form.Subscribe selector={(state) => state.values[name]?.[depth]}>
        {(selected) => {
          const child =
            selected && children.includes(selected) ? selected : null;
          // The parent-itself option is not a child, so it stops the recursion.
          return child ? (
            <HierarchyLevel
              name={name}
              hierarchy={hierarchy}
              translate={translate}
              placeholder={placeholder}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
              depth={depth + 1}
              parent={child}
              label={hierarchyPathLabel(hierarchy, child, translate)}
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
export function HierarchySelectField({
  rootLabel,
  ...rest
}: HierarchySelectFieldProps) {
  return <HierarchyLevel {...rest} depth={0} parent={null} label={rootLabel} />;
}
