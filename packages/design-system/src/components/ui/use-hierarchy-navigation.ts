import { useState } from "react";

import {
  canStopAtPath,
  hierarchyDescendantItems,
  hierarchyLevelItems,
  toHierarchyPath,
  type Hierarchy,
} from "../../lib/hierarchy.ts";

// ponytail: no virtualization, so a short query over a large tree renders at most this many; virtualize the list or require a longer query to lift it.
const MAX_SEARCH_RESULTS = 100;

type HierarchyNavigationOptions = {
  hierarchy: Hierarchy;
  translate: (code: string) => string;
  path: string[];
  onChange: (value: string[]) => void;
  isSelectable: (path: string) => boolean;
};

export function useHierarchyNavigation({
  hierarchy,
  translate,
  path,
  onChange,
  isSelectable,
}: HierarchyNavigationOptions) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingDepth, setEditingDepth] = useState<number | null>(null);

  const childrenOf = (parent: string | null) =>
    hierarchyLevelItems(hierarchy, parent, translate).filter((item) =>
      isSelectable(item.value),
    );

  const current = path.at(-1) ?? null;
  const isLeaf = childrenOf(current).length === 0;
  const canStop = current !== null && canStopAtPath(hierarchy, current);

  const depth = editingDepth ?? path.length;
  const parent = path[depth - 1] ?? null;
  const query = search.trim().toLowerCase();
  const children = query
    ? hierarchyDescendantItems(hierarchy, parent, translate)
        .filter(
          (item) =>
            isSelectable(item.value) &&
            item.label.toLowerCase().includes(query),
        )
        .slice(0, MAX_SEARCH_RESULTS)
    : childrenOf(parent);

  const close = () => {
    setOpen(false);
    setSearch("");
    setEditingDepth(null);
  };

  const edit = (level: number) => {
    setEditingDepth(level);
    setOpen(true);
  };

  const pick = (value: string) => {
    const next = [
      ...path.slice(0, depth),
      ...toHierarchyPath(value).slice(depth),
    ];
    if (next.some((node, level) => node !== path[level])) onChange(next);
    if (childrenOf(value).length === 0) return close();
    setSearch("");
    setEditingDepth(next.length);
  };

  return {
    open,
    setOpen,
    search,
    setSearch,
    current,
    isLeaf,
    canStop,
    depth,
    query,
    children,
    close,
    edit,
    pick,
  };
}
