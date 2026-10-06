import { type LucideIcon, PlusIcon } from "lucide-react";

import { withRequired } from "../../lib/with-required.ts";
import { Button } from "./button.tsx";
import { Checkbox } from "./checkbox.tsx";
import { Label } from "./label.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";

type PickerField = {
  key: string;
  label: string;
  section: string;
  locked: boolean;
};

export function FieldPicker({
  fields,
  selected,
  onSelectedChange,
  triggerLabel,
  triggerVariant = "secondary",
  triggerIcon: TriggerIcon = PlusIcon,
  legend,
}: {
  fields: readonly PickerField[];
  selected: readonly string[];
  onSelectedChange: (keys: string[]) => void;
  triggerLabel: string;
  triggerVariant?: "secondary" | "ghost";
  triggerIcon?: LucideIcon;
  legend: string;
}) {
  function toggle(key: string, checked: boolean) {
    onSelectedChange(
      checked ? [...selected, key] : selected.filter((field) => field !== key),
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant={triggerVariant} className="text-primary">
          <TriggerIcon aria-hidden />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[32rem]">
        <fieldset>
          <legend className="mb-3 text-sm leading-none font-medium">
            {legend}
          </legend>
          <div className="columns-2 gap-6">
            {[...Map.groupBy(fields, (field) => field.section)].map(
              ([section, sectionFields]) => (
                <fieldset key={section} className="mb-4 break-inside-avoid">
                  <legend className="text-muted-foreground mb-2 text-xs font-medium">
                    {section}
                  </legend>
                  <div className="grid gap-3">
                    {sectionFields.map((field) => (
                      <div key={field.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`field-picker-${field.key}`}
                          checked={field.locked || selected.includes(field.key)}
                          disabled={field.locked}
                          onCheckedChange={(state) =>
                            toggle(field.key, state === true)
                          }
                        />
                        <Label htmlFor={`field-picker-${field.key}`}>
                          {withRequired(field.label, field.locked)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              ),
            )}
          </div>
        </fieldset>
      </PopoverContent>
    </Popover>
  );
}
