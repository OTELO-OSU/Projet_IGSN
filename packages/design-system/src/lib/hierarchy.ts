import type { TreeNode } from "@projet-igsn/domain/sample/path/tree-node";

import { isOptionalAtOrAbove } from "@projet-igsn/domain/sample/path/is-optional";
import { resolvePathNode } from "@projet-igsn/domain/sample/path/resolve-node";

export type Hierarchy = {
  roots: readonly string[];
  nodes: Record<string, TreeNode | undefined>;
};

const resolveNode = (hierarchy: Hierarchy, path: string) =>
  resolvePathNode(hierarchy.nodes, path)?.node;

export function isPathSearchable(hierarchy: Hierarchy, path: string): boolean {
  return resolveNode(hierarchy, path)?.searchable === true;
}

function withLabelCode(path: string, code: string | undefined): string {
  return code ? [...path.split(".").slice(0, -1), code].join(".") : path;
}

export function hierarchyPathLabel(
  hierarchy: Hierarchy,
  path: string,
  translate: (code: string) => string,
): string {
  return translate(withLabelCode(path, resolveNode(hierarchy, path)?.label));
}

function hierarchyChildren(
  hierarchy: Hierarchy,
  parent: string | null,
): string[] {
  if (parent === null) return [...hierarchy.roots];
  const choices = resolveNode(hierarchy, parent)?.choices ?? [];
  return choices.map((segment) => `${parent}.${segment}`);
}

export function canStopAtPath(hierarchy: Hierarchy, path: string): boolean {
  const node = resolveNode(hierarchy, path);
  return !node?.choices?.length || isOptionalAtOrAbove(hierarchy.nodes, path);
}

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

export function composeHierarchyValue(path: string[]): string | null {
  return path.at(-1) ?? null;
}

export function toHierarchyPath(value: string | null): string[] {
  if (!value) return [];
  const segments = value.split(".");
  return segments.map((_, index) => segments.slice(0, index + 1).join("."));
}
