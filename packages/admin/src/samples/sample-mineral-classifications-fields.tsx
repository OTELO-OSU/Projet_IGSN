import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FieldListRemoveButton } from "@projet-igsn/design-system/components/form/field-list-item";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { MINERAL_HIERARCHY } from "@projet-igsn/domain/sample/mineral/mineral-hierarchy";
import { MINERAL_ABUNDANCES } from "@projet-igsn/domain/sample/mineral/model";
import { PlusIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { HIERARCHY_FIELD_LABELS } from "#/samples/hierarchy-field-labels.ts";
import {
  mineralAbundanceLabel,
  mineralClassificationLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const abundanceItems = toComboboxItems(
  MINERAL_ABUNDANCES,
  mineralAbundanceLabel,
);

export function SampleMineralClassificationsFields() {
  const form = useSampleForm();
  const isDisabled = useIsFieldDisabled("mineralClassifications");
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-medium">
        {m.section_mineral_classifications()}
      </legend>
      <form.Subscribe selector={(state) => state.values.mineralClassifications}>
        {(rows) =>
          rows.map((row, index) => (
            <div
              key={row.key}
              role="group"
              aria-labelledby={`mineral-classification-${index}-legend`}
              className="grid gap-2"
            >
              <div className="flex items-center gap-1">
                <span
                  id={`mineral-classification-${index}-legend`}
                  className="font-medium"
                >
                  {m.legend_mineral_classification({ index: index + 1 })}
                </span>
                <FieldListRemoveButton
                  label={m.action_remove_mineral_classification({
                    index: index + 1,
                  })}
                  disabled={isDisabled}
                  onClick={() =>
                    form.removeFieldValue("mineralClassifications", index)
                  }
                />
              </div>
              <div className="grid gap-4 sm:flex sm:flex-wrap">
                <form.AppField name={`mineralClassifications[${index}].path`}>
                  {(field) => (
                    <field.HierarchyField
                      label={m.field_mineral_classification()}
                      hierarchy={MINERAL_HIERARCHY}
                      translate={mineralClassificationLabel}
                      placeholder={m.mineral_classification_placeholder()}
                      searchPlaceholder={m.mineral_classification_search_placeholder()}
                      emptyText={m.mineral_classification_empty()}
                      {...HIERARCHY_FIELD_LABELS}
                    />
                  )}
                </form.AppField>
                <form.AppField
                  name={`mineralClassifications[${index}].abundance`}
                >
                  {(field) => (
                    <field.ComboboxField
                      label={m.field_mineral_abundance()}
                      items={abundanceItems}
                      placeholder={m.abundance_placeholder()}
                      searchPlaceholder={m.abundance_search_placeholder()}
                      emptyText={m.abundance_empty()}
                    />
                  )}
                </form.AppField>
              </div>
              <hr className="mt-2 sm:max-w-72" />
            </div>
          ))
        }
      </form.Subscribe>
      {isDisabled ? null : (
        <div>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start sm:max-w-72"
            onClick={() =>
              form.pushFieldValue("mineralClassifications", {
                key: crypto.randomUUID(),
                path: [],
                abundance: undefined,
              })
            }
          >
            <PlusIcon aria-hidden />
            {m.action_add_mineral_classification()}
          </Button>
        </div>
      )}
    </fieldset>
  );
}
