import { MASS_UNITS } from "@projet-igsn/domain/sample/description/mass-unit";
import { SIZE_UNITS } from "@projet-igsn/domain/sample/description/size-unit";
import {
  VOLUME_UNITS,
  volumeUnitLabel,
} from "@projet-igsn/domain/sample/description/volume-unit";

import { m } from "#/paraglide/messages.js";
import { useDescriptionForm } from "#/samples/use-description-form.ts";

const modeItems = [
  { value: "single", label: m.collection_date_mode_single() },
  { value: "range", label: m.collection_date_mode_range() },
];

const orientedItems = [
  { value: "yes", label: m.oriented_yes() },
  { value: "no", label: m.oriented_no() },
];

// Size and mass units are language-neutral symbols (their own label); volume
// units need the display map for superscripts (see volumeUnitLabel).
const sizeUnitItems = SIZE_UNITS.map((value) => ({ value, label: value }));
const massUnitItems = MASS_UNITS.map((value) => ({ value, label: value }));
const volumeUnitItems = VOLUME_UNITS.map((value) => ({
  value,
  label: volumeUnitLabel[value],
}));

const measurementFields = [
  {
    key: "length" as const,
    label: m.field_length,
    unitLabel: m.field_length_unit,
    items: sizeUnitItems,
  },
  {
    key: "width" as const,
    label: m.field_width,
    unitLabel: m.field_width_unit,
    items: sizeUnitItems,
  },
  {
    key: "thickness" as const,
    label: m.field_thickness,
    unitLabel: m.field_thickness_unit,
    items: sizeUnitItems,
  },
  {
    key: "mass" as const,
    label: m.field_mass,
    unitLabel: m.field_mass_unit,
    items: massUnitItems,
  },
  {
    key: "volume" as const,
    label: m.field_volume,
    unitLabel: m.field_volume_unit,
    items: volumeUnitItems,
  },
];

// The Description tab (ADR 0015). Every part is optional and independent; the
// single/range toggle governs only which date inputs show (a single date is
// submitted as the degenerate range start === end), and the orientation
// explanation only shows for an oriented sample. Render inside a
// `form.AppForm`. The form store holds the flat `description.*` draft;
// `composeDescription` maps it back on submit.
export function SampleDescriptionFields() {
  const form = useDescriptionForm();
  return (
    <div className="grid gap-4">
      <form.AppField name="description.collectionDateMode">
        {(field) => (
          <field.ComboboxField
            label={m.field_collection_date_mode()}
            items={modeItems}
            placeholder={m.collection_date_mode_placeholder()}
            searchPlaceholder={m.collection_date_mode_search_placeholder()}
            emptyText={m.collection_date_mode_empty()}
          />
        )}
      </form.AppField>

      <form.Subscribe
        selector={(state) => state.values.description.collectionDateMode}
      >
        {(mode) =>
          mode === "range" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField name="description.collectionDateStart">
                {(field) => (
                  <field.DateField
                    label={`${m.field_collection_date_start()} *`}
                  />
                )}
              </form.AppField>
              <form.AppField name="description.collectionDateEnd">
                {(field) => (
                  <field.DateField
                    label={`${m.field_collection_date_end()} *`}
                  />
                )}
              </form.AppField>
            </div>
          ) : (
            <form.AppField name="description.collectionDate">
              {(field) => (
                <field.DateField label={`${m.field_collection_date()} *`} />
              )}
            </form.AppField>
          )
        }
      </form.Subscribe>

      <form.AppField name="description.oriented">
        {(field) => (
          <field.ComboboxField
            label={m.field_oriented()}
            items={orientedItems}
            placeholder={m.oriented_placeholder()}
            searchPlaceholder={m.oriented_search_placeholder()}
            emptyText={m.oriented_empty()}
          />
        )}
      </form.AppField>

      <form.Subscribe
        selector={(state) => state.values.description.oriented === "yes"}
      >
        {(oriented) =>
          oriented ? (
            <form.AppField name="description.orientationExplanation">
              {(field) => (
                <field.TextField
                  label={m.field_orientation_explanation()}
                  multiline
                />
              )}
            </form.AppField>
          ) : null
        }
      </form.Subscribe>

      <form.AppField name="description.openDescription">
        {(field) => (
          <field.TextField label={m.field_open_description()} multiline />
        )}
      </form.AppField>

      {measurementFields.map(({ key, label, unitLabel, items }) => (
        <div key={key} className="grid gap-4 sm:grid-cols-2">
          <form.AppField name={`description.${key}Value`}>
            {(field) => <field.NumberField label={label()} />}
          </form.AppField>
          <form.AppField name={`description.${key}Unit`}>
            {(field) => (
              <field.ComboboxField
                label={unitLabel()}
                items={items}
                placeholder={m.unit_placeholder()}
                searchPlaceholder={m.unit_search_placeholder()}
                emptyText={m.unit_empty()}
              />
            )}
          </form.AppField>
        </div>
      ))}
    </div>
  );
}
