import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { filterOsusByOrg } from "@projet-igsn/domain/institutional-group/filter-osus-by-org";
import { osuLabel } from "@projet-igsn/domain/institutional-group/label";

import {
  ORGANIZATION_ITEMS,
  toItems,
} from "#/institutional-groups/to-items.ts";
import { m } from "#/paraglide/messages.js";

type FilterProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
};

export function OrganizationFilter({ value, onChange }: FilterProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Label htmlFor="organization-filter" className="shrink-0">
        {m.field_institutional_organization()}
      </Label>
      <div className="min-w-0 flex-1">
        <Combobox
          id="organization-filter"
          items={ORGANIZATION_ITEMS}
          value={value ?? ""}
          onChange={(next) => onChange(next || undefined)}
          placeholder={m.organization_placeholder()}
          searchPlaceholder={m.organization_search_placeholder()}
          emptyText={m.organization_empty()}
        />
      </div>
    </div>
  );
}

export function OsuFilter({
  organization,
  value,
  onChange,
}: FilterProps & { organization: string | undefined }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Label htmlFor="osu-filter" className="shrink-0">
        {m.column_institutional_osu()}
      </Label>
      <div className="min-w-0 flex-1">
        <Combobox
          id="osu-filter"
          items={
            organization === undefined
              ? []
              : toItems(filterOsusByOrg(organization), osuLabel)
          }
          value={value ?? ""}
          onChange={(next) => onChange(next || undefined)}
          disabled={organization === undefined}
          placeholder={m.osu_placeholder()}
          searchPlaceholder={m.osu_search_placeholder()}
          emptyText={m.osu_empty()}
        />
      </div>
    </div>
  );
}
