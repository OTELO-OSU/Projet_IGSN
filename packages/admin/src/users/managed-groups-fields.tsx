import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { ManagedGroups } from "@projet-igsn/domain/user/managed-groups";

import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import {
  MANAGED_LABORATORY_ITEMS,
  MANAGED_ORGANIZATION_ITEMS,
  MANAGED_OSU_ITEMS,
  withGranted,
} from "@projet-igsn/domain/institutional-group/managed-group-items";

import { m } from "#/paraglide/messages.js";

export function ManagedGroupsFields({
  granted,
  manualGroups,
}: {
  granted: ManagedGroups;
  manualGroups: Pick<ManualGroup, "id" | "name">[];
}) {
  const form = useTypedAppFormContext({
    defaultValues: {} as { managedGroups: ManagedGroups },
  });
  const catalogItems = manualGroups.map((group) => ({
    value: group.id,
    label: group.name,
  }));
  const fields = [
    {
      name: "managedGroups.organizations",
      label: m.field_managed_organizations(),
      items: withGranted(MANAGED_ORGANIZATION_ITEMS, granted.organizations),
      placeholder: m.organization_placeholder(),
      emptyText: m.organization_empty(),
    },
    {
      name: "managedGroups.osus",
      label: m.field_managed_osus(),
      items: MANAGED_OSU_ITEMS,
      placeholder: m.osu_placeholder(),
      emptyText: m.osu_empty(),
    },
    {
      name: "managedGroups.laboratories",
      label: m.field_managed_laboratories(),
      items: MANAGED_LABORATORY_ITEMS,
      placeholder: m.laboratory_placeholder(),
      emptyText: m.laboratory_empty(),
    },
    {
      name: "managedGroups.manualGroupIds",
      label: m.field_managed_manual_groups(),
      items: withGranted(catalogItems, granted.manualGroupIds),
      placeholder: m.manual_group_placeholder(),
      emptyText: m.manual_groups_empty(),
    },
  ] as const;

  return (
    <FormSection title={m.user_managed_groups_title()}>
      <p className="text-muted-foreground text-sm">
        {m.user_managed_groups_cascade()}
      </p>
      {fields.map(({ name, label, items, placeholder, emptyText }) => (
        <form.AppField key={name} name={name}>
          {(field) => (
            <field.MultiComboboxField
              label={label}
              items={items}
              placeholder={placeholder}
              searchPlaceholder={m.managed_search_placeholder()}
              emptyText={emptyText}
              removeLabel={(picked) => m.managed_remove({ name: picked })}
            />
          )}
        </form.AppField>
      ))}
    </FormSection>
  );
}
