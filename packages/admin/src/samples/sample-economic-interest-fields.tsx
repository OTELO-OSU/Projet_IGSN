import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import {
  composeHierarchyValue,
  HierarchySelectField,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { ELEMENTS } from "@projet-igsn/domain/sample/element/vocabulary";
import { allowsResourceType } from "@projet-igsn/domain/sample/resource-type/allows-resource-type";
import { allowsResourceTypeElements } from "@projet-igsn/domain/sample/resource-type/allows-resource-type-elements";
import { hasEconomicInterest } from "@projet-igsn/domain/sample/resource-type/has-economic-interest";
import { RESOURCE_TYPE_HIERARCHY } from "@projet-igsn/domain/sample/resource-type/vocabulary";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import {
  type EconomicInterestDraft,
  toEconomicInterestDraft,
} from "#/samples/compose-economic-interest.ts";
import { elementLabel, resourceTypeLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const elementItems = ELEMENTS.map((value) => ({
  value,
  label: elementLabel(value),
}));

export function SampleEconomicInterestFields() {
  const isDisabled = useIsFieldDisabled("resourceTypePath");
  const form = useSampleForm();
  const [enabled, setEnabled] = useState(() =>
    hasEconomicInterest({
      ...form.state.values,
      resourceType: composeHierarchyValue(form.state.values.resourceTypePath),
    }),
  );

  const toggleEnabled = (next: boolean) => {
    setEnabled(next);
    if (next) return;
    for (const [name, value] of Object.entries(toEconomicInterestDraft()))
      form.setFieldValue(name as keyof EconomicInterestDraft, value);
  };

  return (
    <form.Subscribe
      selector={(state) =>
        allowsResourceType(composeHierarchyValue(state.values.materialPath))
      }
    >
      {(allowed) =>
        allowed ? (
          <FormSection
            title={m.section_economic_interest()}
            action={
              <Switch
                checked={enabled}
                disabled={isDisabled}
                onCheckedChange={toggleEnabled}
                aria-label={m.economic_interest_toggle()}
              />
            }
          >
            {enabled ? (
              <div className="grid gap-4">
                <HierarchySelectField
                  name="resourceTypePath"
                  hierarchy={RESOURCE_TYPE_HIERARCHY}
                  translate={resourceTypeLabel}
                  rootLabel={m.field_resource_type()}
                  placeholder={m.economic_interest_placeholder()}
                  searchPlaceholder={m.economic_interest_search_placeholder()}
                  emptyText={m.economic_interest_empty()}
                />

                <form.Subscribe
                  selector={(state) =>
                    allowsResourceTypeElements(
                      composeHierarchyValue(state.values.resourceTypePath),
                    )
                  }
                >
                  {(allowsElements) =>
                    allowsElements ? (
                      <form.AppField name="economicInterestElements">
                        {(field) => (
                          <field.MultiComboboxField
                            label={m.field_economic_interest_elements()}
                            items={elementItems}
                            placeholder={m.economic_interest_elements_placeholder()}
                            searchPlaceholder={m.economic_interest_search_placeholder()}
                            emptyText={m.economic_interest_empty()}
                            removeLabel={(label) =>
                              m.economic_interest_element_remove({ label })
                            }
                          />
                        )}
                      </form.AppField>
                    ) : null
                  }
                </form.Subscribe>

                <form.AppField name="economicResourceTypePrecision">
                  {(field) => (
                    <field.TextField
                      label={m.field_economic_resource_type_precision()}
                    />
                  )}
                </form.AppField>

                <form.AppField name="economicDepositName">
                  {(field) => (
                    <field.TextField label={m.field_economic_deposit_name()} />
                  )}
                </form.AppField>

                <form.AppField name="economicDepositDescription">
                  {(field) => (
                    <field.TextField
                      label={m.field_economic_deposit_description()}
                      multiline
                    />
                  )}
                </form.AppField>
              </div>
            ) : null}
          </FormSection>
        ) : null
      }
    </form.Subscribe>
  );
}
