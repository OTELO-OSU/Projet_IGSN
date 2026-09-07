import { HierarchyInput } from "@projet-igsn/design-system/components/ui/hierarchy-input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  composeHierarchyValue,
  type Hierarchy,
  isPathSearchable,
  toHierarchyPath,
} from "@projet-igsn/design-system/lib/hierarchy";
import { useId } from "react";

import { m } from "#/paraglide/messages.js";

type HierarchyFacetProps = {
  hierarchy: Hierarchy;
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
  translate,
  label,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
}: HierarchyFacetProps) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <HierarchyInput
        id={id}
        hierarchy={hierarchy}
        translate={translate}
        value={toHierarchyPath(value ?? null)}
        onChange={(path) => onChange(composeHierarchyValue(path) ?? undefined)}
        isSelectable={(path) => isPathSearchable(hierarchy, path)}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        stopLabel={m.hierarchy_stop_here()}
        removeLabel={(label) => m.hierarchy_remove_level({ label })}
      />
    </div>
  );
}
