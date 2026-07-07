import type { Nature } from "@projet-igsn/domain/sample/nature";

import { withForm } from "@projet-igsn/design-system/components/form/app-form";
import {
  SAMPLE_TYPE_TREE,
  SAMPLE_TYPES,
  type SampleType,
} from "@projet-igsn/domain/sample/type";

import { m } from "#/paraglide/messages.js";
import { typeLabel } from "#/samples/type-label.ts";

const typeItems = (Object.keys(SAMPLE_TYPE_TREE) as SampleType[]).map(
  (type) => ({ value: type, label: typeLabel(type) }),
);

// ponytail: two select levels cover today's vocabulary; turn this into a
// recursive cascade when a deeper taxonomy lands.
function subTypeItems(type: string) {
  return SAMPLE_TYPES.filter((path) => path.startsWith(`${type}.`)).map(
    (path) => ({ value: path, label: typeLabel(path) }),
  );
}

// The two selects hold the root code and the full sub path; the domain value
// is the deepest one picked.
export function composeType({
  type,
  subType,
}: {
  type: string;
  subType: string;
}): string | null {
  return subType || type || null;
}

export const SampleTypeFields = withForm({
  // Shape only used for type inference; the values come from the parent form.
  defaultValues: {
    name: "",
    nature: "" as Nature | "",
    type: "" as SampleType | "",
    subType: "",
  },
  render: function SampleTypeFieldsRender({ form }) {
    return (
      <>
        <form.AppField
          name="type"
          listeners={{
            // A new type invalidates the previous refinement.
            onChange: () => form.setFieldValue("subType", ""),
          }}
        >
          {(field) => (
            <field.ComboboxField
              label={m.field_type()}
              items={typeItems}
              placeholder={m.type_placeholder()}
              searchPlaceholder={m.type_search_placeholder()}
              emptyText={m.type_empty()}
            />
          )}
        </form.AppField>

        <form.Subscribe selector={(state) => state.values.type}>
          {(type) => {
            if (!type) return null;
            const items = subTypeItems(type);
            return items.length > 0 ? (
              <form.AppField name="subType">
                {(field) => (
                  <field.ComboboxField
                    // The sub-type refines the chosen type; label it as such.
                    label={typeLabel(type)}
                    items={[
                      // The bare type is the "no sub-type" choice; it composes
                      // to the root path, so no sentinel value is needed.
                      { value: type, label: m.sub_type_none() },
                      ...items,
                    ]}
                    placeholder={m.sub_type_placeholder()}
                    searchPlaceholder={m.sub_type_search_placeholder()}
                    emptyText={m.sub_type_empty()}
                  />
                )}
              </form.AppField>
            ) : null;
          }}
        </form.Subscribe>
      </>
    );
  },
});
