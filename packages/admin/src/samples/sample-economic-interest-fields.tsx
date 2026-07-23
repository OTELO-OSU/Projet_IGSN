import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import {
  composeHierarchyValue,
  HierarchySelectField,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { ECONOMIC_INTEREST_HIERARCHY } from "@projet-igsn/domain/sample/economic-interest/vocabulary";
import { ELEMENTS } from "@projet-igsn/domain/sample/element/vocabulary";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";

import { m } from "#/paraglide/messages.js";
import { type EconomicInterestDraft } from "#/samples/compose-economic-interest.ts";
import {
  economicInterestLabel,
  elementLabel,
} from "#/samples/sample-labels.ts";

// The ~100 elements as multi-select items (searchable chips, not a flat list).
const elementItems = ELEMENTS.map((value) => ({
  value,
  label: elementLabel(value),
}));

// The Economic interest section. The answer is a yes/no/unknown hierarchy (a
// resource classification refines it under `yes`); the free-text detail applies
// to any `yes` answer and the chemical elements only to a mineral_and_ore
// resource, so each stays disabled/hidden until it applies (dependent-fields
// rule). Render inside a `form.AppForm`. The form store holds the flat
// economic-interest draft, so a value hidden by the current answer survives a
// switch back (ADR 0015); composeEconomicInterest drops it on submit.
export function SampleEconomicInterestFields() {
  const form = useTypedAppFormContext({
    defaultValues: {} as EconomicInterestDraft,
  });
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

              <form.AppField name="economicResourceTypePrecision">
                {(field) => (
                  <field.TextField
                    label={m.field_economic_resource_type_precision()}
                    disabled={!yes}
                  />
                )}
              </form.AppField>

              <form.AppField name="economicDepositName">
                {(field) => (
                  <field.TextField
                    label={m.field_economic_deposit_name()}
                    disabled={!yes}
                  />
                )}
              </form.AppField>

              <form.AppField name="economicDepositDescription">
                {(field) => (
                  <field.TextField
                    label={m.field_economic_deposit_description()}
                    multiline
                    disabled={!yes}
                  />
                )}
              </form.AppField>
            </>
          );
        }}
      </form.Subscribe>
    </div>
  );
}
