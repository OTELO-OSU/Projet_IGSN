import {
  composeHierarchyValue,
  HierarchySelectField,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { ECONOMIC_INTEREST_HIERARCHY } from "@projet-igsn/domain/sample/economic-interest/vocabulary";
import { ELEMENTS } from "@projet-igsn/domain/sample/element/vocabulary";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";

import { m } from "#/paraglide/messages.js";
import {
  economicInterestLabel,
  elementLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const elementItems = ELEMENTS.map((value) => ({
  value,
  label: elementLabel(value),
}));

export function SampleEconomicInterestFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      <HierarchySelectField
        name="economicInterestPath"
        hierarchy={ECONOMIC_INTEREST_HIERARCHY}
        translate={economicInterestLabel}
        rootLabel={m.field_economic_interest()}
        placeholder={m.economic_interest_placeholder()}
        searchPlaceholder={m.economic_interest_search_placeholder()}
        emptyText={m.economic_interest_empty()}
      />

      <form.Subscribe
        selector={(state) =>
          composeHierarchyValue(state.values.economicInterestPath ?? [])
        }
      >
        {(path) => {
          const yes = isPathAtOrUnder(path, "yes");
          const mineralOre = isPathAtOrUnder(path, "yes.mineral_and_ore");
          return (
            <>
              {mineralOre ? (
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
              ) : null}

              {yes ? (
                <>
                  <form.AppField name="economicResourceTypePrecision">
                    {(field) => (
                      <field.TextField
                        label={m.field_economic_resource_type_precision()}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="economicDepositName">
                    {(field) => (
                      <field.TextField
                        label={m.field_economic_deposit_name()}
                      />
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
                </>
              ) : null}
            </>
          );
        }}
      </form.Subscribe>
    </div>
  );
}
