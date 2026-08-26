import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";

import { ORGANIZATION_ITEMS } from "#/institutional-groups/to-items.ts";
import { m } from "#/paraglide/messages.js";

type FilterProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
};

export function OrganizationFilter({ value, onChange }: FilterProps) {
  return (
    <>
      <Label htmlFor="organization-filter">
        {m.field_institutional_organization()}
      </Label>
      <Combobox
        id="organization-filter"
        items={ORGANIZATION_ITEMS}
        value={value ?? ""}
        onChange={(next) => onChange(next || undefined)}
        placeholder={m.organization_placeholder()}
        searchPlaceholder={m.organization_search_placeholder()}
        emptyText={m.organization_empty()}
      />
    </>
  );
}
