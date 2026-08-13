import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Checkbox } from "@projet-igsn/design-system/components/ui/checkbox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@projet-igsn/design-system/components/ui/popover";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { PlusIcon } from "lucide-react";

import {
  PICKABLE_FIELDS,
  selectedCardFields,
} from "#/domain/samples/card-fields.ts";
import { m } from "#/paraglide/messages.js";

type PickableFields = typeof PICKABLE_FIELDS;

function groupBySection(fields: PickableFields) {
  const sections = new Map<string, PickableFields[number][]>();
  for (const field of fields) {
    const section = field.section();
    const group = sections.get(section);
    if (group) {
      group.push(field);
    } else {
      sections.set(section, [field]);
    }
  }
  return sections;
}

export function CardFieldPicker({
  fields = [],
  onFieldsChange,
}: {
  fields?: string[];
  onFieldsChange: (fields: string[]) => void;
}) {
  function toggle(key: string, checked: boolean) {
    const next = checked
      ? [...fields, key]
      : fields.filter((field) => field !== key);
    onFieldsChange(selectedCardFields(next).map((field) => field.key));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline">
          <PlusIcon aria-hidden />
          {m.card_fields_add()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[32rem]">
        <fieldset>
          <legend className="mb-3 text-sm leading-none font-medium">
            {m.card_fields_legend()}
          </legend>
          <div className="columns-2 gap-6">
            {[...groupBySection(PICKABLE_FIELDS)].map(
              ([section, sectionFields]) => (
                <fieldset key={section} className="mb-4 break-inside-avoid">
                  <legend className="text-muted-foreground mb-2 text-xs font-medium">
                    {section}
                  </legend>
                  <div className="grid gap-3">
                    {sectionFields.map((field) => (
                      <div key={field.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`card-field-${field.key}`}
                          checked={field.locked || fields.includes(field.key)}
                          disabled={field.locked}
                          onCheckedChange={(state) =>
                            toggle(field.key, state === true)
                          }
                        />
                        <Label htmlFor={`card-field-${field.key}`}>
                          {withRequired(field.label(), field.locked)}
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
