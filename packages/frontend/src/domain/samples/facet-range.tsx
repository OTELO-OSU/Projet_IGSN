import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { useId } from "react";

import { m } from "#/paraglide/messages.js";

export function RangeFacet({
  unitItems,
  min,
  max,
  unit,
  onChangeMin,
  onChangeMax,
  onChangeUnit,
}: {
  unitItems: { value: string; label: string }[];
  min: number | undefined;
  max: number | undefined;
  unit: string | undefined;
  onChangeMin: (value: number | undefined) => void;
  onChangeMax: (value: number | undefined) => void;
  onChangeUnit: (value: string | undefined) => void;
}) {
  const minId = useId();
  const maxId = useId();
  const unitId = useId();
  const toBound = (raw: string): number | undefined =>
    raw.trim() === "" ? undefined : Number(raw);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={minId}>{m.facet_age_min()}</Label>
          <Input
            id={minId}
            type="number"
            defaultValue={min ?? ""}
            onBlur={(event) => onChangeMin(toBound(event.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={maxId}>{m.facet_age_max()}</Label>
          <Input
            id={maxId}
            type="number"
            defaultValue={max ?? ""}
            onBlur={(event) => onChangeMax(toBound(event.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={unitId}>{m.facet_age_unit()}</Label>
        <Combobox
          id={unitId}
          items={unitItems}
          value={unit ?? "ma"}
          onChange={(picked) => onChangeUnit(picked || undefined)}
          placeholder={m.facet_any()}
          searchPlaceholder={m.facet_search_placeholder()}
          emptyText={m.facet_empty()}
        />
      </div>
    </div>
  );
}
