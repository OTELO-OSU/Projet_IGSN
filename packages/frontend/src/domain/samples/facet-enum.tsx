import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { useId } from "react";

import { m } from "#/paraglide/messages.js";

export function EnumFacet({
  label,
  items,
  value,
  onChange,
  disabled,
}: {
  label: string;
  items: { value: string; label: string }[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        id={id}
        items={items}
        value={value ?? ""}
        onChange={(picked) => onChange(picked || undefined)}
        disabled={disabled}
        placeholder={m.facet_any()}
        searchPlaceholder={m.facet_search_placeholder()}
        emptyText={m.facet_empty()}
      />
    </div>
  );
}
