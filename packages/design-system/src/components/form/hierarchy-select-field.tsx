import { withRequired } from "../../lib/with-required.ts";
import { useTypedAppFormContext } from "./app-form.tsx";
import { HierarchyCascade } from "./hierarchy-cascade.tsx";

// Structural mirror of the domain vocabulary trees (design-system MUST NOT
// import domain).
export type HierarchyNodeDef = {
  label?: string;
  optional?: boolean;
  choices?: readonly string[];
  childLabel?: string;
  // Offered as a public search-facet option (mirrors domain TreeNode). Unused by
  // the form widget; the facet sidebar filters levels by it.
  searchable?: boolean;
};

// A hierarchical vocabulary as one self-describing bundle: its entry segments
// and its segment-keyed nodes, where a dotted key overrides the bare segment in
// that context (the full path is the identity, ADR 0010).
export type Hierarchy = {
  roots: readonly string[];
  nodes: Record<string, HierarchyNodeDef | undefined>;
};

// Trees are proven acyclic upstream (domain expandPaths throws on cycles at
// import).
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

export function isPathSearchable(hierarchy: Hierarchy, path: string): boolean {
  return resolveNode(hierarchy, path)?.searchable === true;
}

const identity = (code: string) => code;

export function hierarchyPathLabel(
  hierarchy: Hierarchy,
  path: string,
  translate: (code: string) => string = identity,
): string {
  return translate(
    resolveNode(hierarchy, path)?.label ?? path.split(".").at(-1) ?? path,
  );
}

export function hierarchyChildLabel(
  hierarchy: Hierarchy,
  parent: string,
  translate: (code: string) => string = identity,
): string {
  const node = resolveNode(hierarchy, parent);
  return translate(
    node?.childLabel ?? node?.label ?? parent.split(".").at(-1) ?? parent,
  );
}

export function hierarchyChildren(
  hierarchy: Hierarchy,
  parent: string | null,
): string[] {
  if (parent === null) return [...hierarchy.roots];
  const choices = resolveNode(hierarchy, parent)?.choices ?? [];
  return choices.map((segment) => `${parent}.${segment}`);
}

export function canStopAtPath(hierarchy: Hierarchy, path: string): boolean {
  const node = resolveNode(hierarchy, path);
  return !node?.choices?.length || node.optional === true;
}

// When stopping at an optional parent is allowed, the user stops by leaving the
// level blank (composeHierarchyValue keeps the ancestor), so there is no
// synthetic "stop here" option echoing the parent inside its own refinement
// select.
export function hierarchyLevelItems(
  hierarchy: Hierarchy,
  parent: string | null,
  translate: (code: string) => string,
): { value: string; label: string }[] {
  return hierarchyChildren(hierarchy, parent).map((path) => ({
    value: path,
    label: hierarchyPathLabel(hierarchy, path, translate),
  }));
}

export function levelLabel(
  hierarchy: Hierarchy,
  label: string,
  parent: string | null,
): string {
  return withRequired(
    label,
    Boolean(parent && !canStopAtPath(hierarchy, parent)),
  );
}

export function composeHierarchyValue(path: string[]): string | null {
  return path.filter(Boolean).at(-1) ?? null;
}

export function toHierarchyPath(value: string | null): string[] {
  if (!value) return [];
  const segments = value.split(".");
  return segments.map((_, index) => segments.slice(0, index + 1).join("."));
}

type HierarchySelectFieldProps = {
  // Form field holding the per-level path (a string[]); must exist in the
  // parent form's defaultValues.
  name: string;
  hierarchy: Hierarchy;
  // Translates a node's label code; owned by the calling package (i18n rule).
  translate?: (code: string) => string;
  rootLabel: string;
  // Marks the root label with the trailing "*" publish marker; deeper levels
  // derive their own from the tree's stop rules.
  requiredToPublish?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  // Fired whenever any level's selection changes, after the deeper levels are
  // truncated.
  onChange?: () => void;
};

// Render inside a `form.AppForm`.
export function HierarchySelectField({
  name,
  hierarchy,
  translate = identity,
  rootLabel,
  requiredToPublish = false,
  placeholder,
  searchPlaceholder,
  emptyText,
  onChange,
}: HierarchySelectFieldProps) {
  const form = useTypedAppFormContext({
    defaultValues: {} as Record<string, string[]>,
  });

  return (
    <form.Subscribe
      selector={(state) =>
        composeHierarchyValue(state.values[name] ?? []) ?? undefined
      }
    >
      {(value) => (
        <HierarchyCascade
          hierarchy={hierarchy}
          translate={translate}
          value={value}
          rootLabel={withRequired(rootLabel, requiredToPublish)}
          itemsAt={(parent) =>
            hierarchyLevelItems(hierarchy, parent, translate)
          }
          renderLevel={({ parent, depth, label, items }) => (
            <form.AppField
              name={`${name}[${depth}]`}
              listeners={{
                onChange: () => {
                  form.setFieldValue(name, (path) => path.slice(0, depth + 1));
                  onChange?.();
                },
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
          )}
        />
      )}
    </form.Subscribe>
  );
}
