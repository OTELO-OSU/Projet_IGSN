import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";

import type { FilterEntry } from "#/filters/list-header.tsx";

import { m } from "#/paraglide/messages.js";

const FILTER_ID = "no-manager-filter";

export function noManagerFilterEntry({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}): FilterEntry {
  return {
    name: "noManager",
    label: m.filter_no_manager_label(),
    active: checked,
    onRemove: () => onChange(false),
    cell: (
      <div className="flex items-center gap-2">
        <Switch id={FILTER_ID} checked={checked} onCheckedChange={onChange} />
        <Label htmlFor={FILTER_ID}>{m.filter_no_manager_label()}</Label>
      </div>
    ),
  };
}
