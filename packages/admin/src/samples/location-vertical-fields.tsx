import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { VERTICAL_REFERENCES } from "@projet-igsn/domain/sample/location/vertical-reference";
import { VERTICAL_REFERENCE_SYSTEMS } from "@projet-igsn/domain/sample/location/vertical-reference-system";

import { m } from "#/paraglide/messages.js";
import { isVerticalEntered } from "#/samples/compose-location.ts";
import {
  verticalReferenceLabel,
  verticalReferenceSystemLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const referenceItems = toComboboxItems(
  VERTICAL_REFERENCES,
  verticalReferenceLabel,
);
const systemItems = toComboboxItems(
  VERTICAL_REFERENCE_SYSTEMS,
  verticalReferenceSystemLabel,
);

export function LocationVerticalFields() {
  const form = useSampleForm();
  return (
    <form.Subscribe
      selector={(state) => isVerticalEntered(state.values.location)}
    >
      {(entered) =>
        entered ? (
          <div className="grid gap-4 sm:col-span-3">
            <form.AppField name="location.verticalReference">
              {(field) => (
                <field.ComboboxField
                  label={m.field_vertical_reference()}
                  requiredToPublish
                  items={referenceItems}
                  placeholder={m.vertical_reference_placeholder()}
                  searchPlaceholder={m.vertical_reference_search_placeholder()}
                  emptyText={m.vertical_reference_empty()}
                />
              )}
            </form.AppField>
            <form.AppField name="location.verticalReferenceSystem">
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
        ) : null
      }
    </form.Subscribe>
  );
}
