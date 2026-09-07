// Structural mirror of the domain vocabulary trees (design-system MUST NOT
// import domain).
export type HierarchyNodeDef = {
  label?: string;
  optional?: boolean;
  choices?: readonly string[];
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

function withLabelCode(path: string, code: string | undefined): string {
  return code ? [...path.split(".").slice(0, -1), code].join(".") : path;
}

export function hierarchyPathLabel(
  hierarchy: Hierarchy,
  path: string,
  translate: (code: string) => string = identity,
): string {
  return translate(withLabelCode(path, resolveNode(hierarchy, path)?.label));
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

export function hierarchyLevelItems(
  hierarchy: Hierarchy,
  parent: string | null,
  translate: (code: string) => string = identity,
): { value: string; label: string }[] {
  return hierarchyChildren(hierarchy, parent).map((path) => ({
    value: path,
    label: hierarchyPathLabel(hierarchy, path, translate),
  }));
}

export function composeHierarchyValue(path: string[]): string | null {
  return path.filter(Boolean).at(-1) ?? null;
}

export function toHierarchyPath(value: string | null): string[] {
  if (!value) return [];
  const segments = value.split(".");
  return segments.map((_, index) => segments.slice(0, index + 1).join("."));
}
