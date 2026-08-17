import { HierarchyCascade } from "@projet-igsn/design-system/components/form/hierarchy-cascade";
import {
  type Hierarchy,
  hierarchyLevelItems,
  isPathSearchable,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { useId } from "react";

type HierarchyFacetProps = {
  hierarchy: Hierarchy;
  translate: (code: string) => string;
  rootLabel: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
};

function FacetLevel({
  id,
  label,
  items,
  current,
  onPick,
  placeholder,
  searchPlaceholder,
  emptyText,
}: {
  id: string;
  label: string;
  items: { value: string; label: string }[];
  current: string;
  onPick: (value: string | undefined) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        id={id}
        items={items}
        value={current}
        onChange={onPick}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
      />
    </div>
  );
}

export function HierarchyFacet({
  hierarchy,
  translate,
  rootLabel,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
}: HierarchyFacetProps) {
  const id = useId();
  return (
    <HierarchyCascade
      hierarchy={hierarchy}
      translate={translate}
      value={value}
      onChange={onChange}
      rootLabel={rootLabel}
      itemsAt={(parent) =>
        hierarchyLevelItems(hierarchy, parent, translate).filter((item) =>
          isPathSearchable(hierarchy, item.value),
        )
      }
      renderLevel={({ depth, label, items, current, onPick }) => (
        <FacetLevel
          id={`${id}-${depth}`}
          label={label}
          items={items}
          current={current}
          onPick={onPick}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
        />
      )}
    />
  );
}
