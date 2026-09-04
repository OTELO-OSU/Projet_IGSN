import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { PROVENANCE_STATUSES } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

import { m } from "#/paraglide/messages.js";
import { provenanceStatusLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const provenanceStatusItems = toComboboxItems(
  PROVENANCE_STATUSES,
  provenanceStatusLabel,
);

export function ProvenanceStatusField() {
  const form = useSampleForm();
  return (
    <form.AppField name="scientificContext.provenanceStatus">
      {(field) => (
        <field.ComboboxField
          label={m.field_provenance_status()}
          requiredToPublish
          items={provenanceStatusItems}
          placeholder={m.provenance_status_placeholder()}
          searchPlaceholder={m.provenance_status_search_placeholder()}
          emptyText={m.provenance_status_empty()}
        />
      )}
    </form.AppField>
  );
}
