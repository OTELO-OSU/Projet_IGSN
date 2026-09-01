import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { allowedAvailabilityStatuses } from "@projet-igsn/domain/sample/curation/allowed-availability-statuses";
import { existenceStatusSchema } from "@projet-igsn/domain/sample/curation/existence-status";

import { m } from "#/paraglide/messages.js";
import {
  availabilityStatusLabel,
  existenceStatusLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const existenceStatusItems = toComboboxItems(
  existenceStatusSchema.options,
  existenceStatusLabel,
);

export function ExistenceStatusField() {
  const form = useSampleForm();
  return (
    <form.AppField
      name="existenceStatus"
      listeners={{
        onChange: ({ value }) => {
          const allowed = allowedAvailabilityStatuses(value);
          const current = form.state.values.availabilityStatus;
          if (current && !allowed.includes(current)) {
            form.setFieldValue("availabilityStatus", allowed[0]);
          }
        },
      }}
    >
      {(field) => (
        <field.ComboboxField
          label={m.field_existence_status()}
          requiredToPublish
          items={existenceStatusItems}
          placeholder={m.existence_status_placeholder()}
          searchPlaceholder={m.existence_status_search_placeholder()}
          emptyText={m.existence_status_empty()}
        />
      )}
    </form.AppField>
  );
}

export function AvailabilityStatusField() {
  const form = useSampleForm();
  return (
    <form.Subscribe selector={(state) => state.values.existenceStatus}>
      {(existenceStatus) => (
        <form.AppField name="availabilityStatus">
          {(field) => (
            <field.ComboboxField
              label={m.field_availability_status()}
              requiredToPublish
              items={toComboboxItems(
                allowedAvailabilityStatuses(existenceStatus),
                availabilityStatusLabel,
              )}
              placeholder={m.availability_status_placeholder()}
              searchPlaceholder={m.availability_status_search_placeholder()}
              emptyText={m.availability_status_empty()}
            />
          )}
        </form.AppField>
      )}
    </form.Subscribe>
  );
}
