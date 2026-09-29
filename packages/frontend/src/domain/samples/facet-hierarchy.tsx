import { HierarchyInput } from "@projet-igsn/design-system/components/ui/hierarchy-input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  composeHierarchyValue,
  type Hierarchy,
  hierarchyPathLabel,
  isPathSearchable,
  toHierarchyPath,
} from "@projet-igsn/design-system/lib/hierarchy";
import { useId } from "react";

import { m } from "#/paraglide/messages.js";

type HierarchyFacetProps = {
  hierarchy: Hierarchy;
  counts: Record<string, number> | undefined;
  translate: (code: string) => string;
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
};

export function HierarchyFacet({
  hierarchy,
  counts,
  translate,
  label,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
}: HierarchyFacetProps) {
  const id = useId();
  const selected = toHierarchyPath(value ?? null);
  const countByLabelCode = new Map(
    Object.entries(counts ?? {}).map(([path, count]) => [
      hierarchyPathLabel(hierarchy, path, (code) => code),
      count,
    ]),
  );
  const withCount = (code: string) => {
    const count = countByLabelCode.get(code);
    return count ? `${translate(code)} (${count})` : translate(code);
  };
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <HierarchyInput
        id={id}
        hierarchy={hierarchy}
        translate={withCount}
        value={selected}
        onChange={(path) => onChange(composeHierarchyValue(path) ?? undefined)}
        isSelectable={(path) =>
          selected.includes(path) ||
          (isPathSearchable(hierarchy, path) &&
            (!counts || (counts[path] ?? 0) > 0))
        }
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        stopLabel={m.hierarchy_stop_here()}
        removeLabel={(label) => m.hierarchy_remove_level({ label })}
      />
    </div>
  );
}
