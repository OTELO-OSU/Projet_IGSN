import type { LocationType } from "@projet-igsn/domain/sample/location/location-type";

import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FieldListRemoveButton } from "@projet-igsn/design-system/components/form/field-list-item";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { VERTICAL_REFERENCES } from "@projet-igsn/domain/sample/location/vertical-reference";
import { VERTICAL_REFERENCE_SYSTEMS } from "@projet-igsn/domain/sample/location/vertical-reference-system";
import { ChevronDownIcon, PlusIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { LocationVerticalValuesFields } from "#/samples/location-vertical-values-fields.tsx";
import {
  verticalReferenceLabel,
  verticalReferenceSystemLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";
import { verticalPositionLegend } from "#/samples/vertical-position-legend.ts";

const systemItems = toComboboxItems(
  VERTICAL_REFERENCE_SYSTEMS,
  verticalReferenceSystemLabel,
);

export function LocationVerticalFields({ type }: { type: LocationType }) {
  const form = useSampleForm();
  const isDisabled = useIsFieldDisabled("location.verticalPositions");
  return (
    <form.Subscribe
      selector={(state) => state.values.location.verticalPositions}
    >
      {(rows) => {
        const unusedReferences = VERTICAL_REFERENCES.filter(
          (reference) => !rows.some((row) => row.reference === reference),
        );
        return (
          <>
            {isDisabled && rows.length === 0 ? null : (
              <p className="font-medium">{m.legend_vertical_positions()}</p>
            )}
            {rows.map((row, index) => (
              <div
                key={row.key}
                role="group"
                aria-labelledby={`vertical-position-${index}-legend`}
                className="grid gap-2"
              >
                <div className="flex items-center gap-1">
                  <span
                    id={`vertical-position-${index}-legend`}
                    className="font-medium"
                  >
                    {verticalPositionLegend(index, row.reference)}
                  </span>
                  <FieldListRemoveButton
                    label={m.action_remove_vertical_position({
                      index: index + 1,
                    })}
                    disabled={isDisabled}
                    onClick={() =>
                      form.removeFieldValue("location.verticalPositions", index)
                    }
                  />
                </div>
                <div className="grid gap-4 sm:flex sm:flex-wrap">
                  {row.reference ? null : (
                    <form.AppField
                      name={`location.verticalPositions[${index}].reference`}
                    >
                      {(field) => (
                        <field.ComboboxField
                          label={m.field_vertical_reference()}
                          items={toComboboxItems(
                            unusedReferences,
                            verticalReferenceLabel,
                          )}
                          placeholder={m.vertical_reference_placeholder()}
                          searchPlaceholder={m.vertical_reference_search_placeholder()}
                          emptyText={m.vertical_reference_empty()}
                        />
                      )}
                    </form.AppField>
                  )}
                  <LocationVerticalValuesFields index={index} type={type} />
                  <form.AppField
                    name={`location.verticalPositions[${index}].system`}
                  >
                    {(field) => (
                      <field.ComboboxField
                        label={m.field_vertical_reference_system()}
                        items={systemItems}
                        placeholder={m.vertical_reference_system_placeholder()}
                        searchPlaceholder={m.vertical_reference_system_search_placeholder()}
                        emptyText={m.vertical_reference_system_empty()}
                      />
                    )}
                  </form.AppField>
                </div>
              </div>
            ))}
            {isDisabled || rows.length >= VERTICAL_REFERENCES.length ? null : (
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start sm:max-w-72"
                    >
                      <PlusIcon aria-hidden />
                      {m.action_add_vertical_position()}
                      <ChevronDownIcon aria-hidden className="ml-auto" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {unusedReferences.map((reference) => (
                      <DropdownMenuItem
                        key={reference}
                        onSelect={() =>
                          form.pushFieldValue("location.verticalPositions", {
                            key: crypto.randomUUID(),
                            reference,
                            system: undefined,
                            start: undefined,
                            end: undefined,
                          })
                        }
                      >
                        {verticalReferenceLabel(reference)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </>
        );
      }}
    </form.Subscribe>
  );
}
