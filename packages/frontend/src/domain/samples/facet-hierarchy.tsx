import {
  type Hierarchy,
  hierarchyChildLabel,
  hierarchyLevelItems,
  isPathSearchable,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { useId } from "react";

// The child path of `parent` that the current dot-path value selects at this
// level, or "" when the value does not descend through this level.
function selectedChild(
  parent: string | null,
  value: string | undefined,
): string {
  if (!value) return "";
  const depth = parent ? parent.split(".").length : 0;
  const segments = value.split(".");
  if (segments.length <= depth) return "";
  const prefix = segments.slice(0, depth + 1).join(".");
  if (parent && !prefix.startsWith(`${parent}.`)) return "";
  return prefix;
}

type LevelProps = {
  hierarchy: Hierarchy;
  translate: (code: string) => string;
  label: string;
  parent: string | null;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
};

// One cascade level: a searchable combobox over the children of `parent`. Its
// value is the picked child (a full dot-path); picking it again clears back to
// `parent` (or clears the facet at the root). A deeper level renders whenever
// the picked child itself has children, mirroring the admin declaration form.
function Level({
  hierarchy,
  translate,
  label,
  parent,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
}: LevelProps) {
  const id = useId();
  // Only nodes flagged searchable are offered (no inheritance); a level with no
  // searchable children renders nothing, ending the cascade.
  const items = hierarchyLevelItems(hierarchy, parent, translate).filter(
    (item) => isPathSearchable(hierarchy, item.value),
  );
  if (items.length === 0) return null;

  const current = selectedChild(parent, value);
  const child =
    current && items.some((item) => item.value === current) ? current : null;

  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <Combobox
          id={id}
          items={items}
          value={current}
          onChange={(picked) => onChange(picked || parent || undefined)}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
        />
      </div>
      {child ? (
        <Level
          hierarchy={hierarchy}
          translate={translate}
          label={hierarchyChildLabel(hierarchy, child, translate)}
          parent={child}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
        />
      ) : null}
    </>
  );
}

type HierarchyFacetProps = Omit<LevelProps, "parent" | "label"> & {
  rootLabel: string;
};

// A hierarchical facet driven entirely by its dot-path value (from the URL): the
// cascade of levels is derived, so there is no local state to keep in sync.
export function HierarchyFacet({ rootLabel, ...rest }: HierarchyFacetProps) {
  return <Level {...rest} parent={null} label={rootLabel} />;
}
