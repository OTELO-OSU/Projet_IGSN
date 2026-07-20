import type { Description } from "@projet-igsn/domain/sample/description/model";

import { volumeUnitLabel } from "@projet-igsn/domain/sample/description/volume-unit";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

// "March 5, 2024" for a single date (start === end), "March 5 – April 1, ..."
// as two dates otherwise. The strings are date-only, so parsing yields UTC
// midnight; formatting in UTC avoids an off-by-one-day drift.
const collectionDateText = ({
  start,
  end,
}: NonNullable<Description["collectionDate"]>): string => {
  const format = new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "long",
    timeZone: "UTC",
  });
  return start === end
    ? format.format(new Date(start))
    : `${format.format(new Date(start))} – ${format.format(new Date(end))}`;
};

// The description rows of the sample detail page; FieldRow drops the parts
// the sample lacks (every part of a Description is optional; the parent hides
// the whole section when the sample has none).
export function DescriptionView({ description }: { description: Description }) {
  // Size and mass unit codes are their own display labels; volume codes are
  // not (cm3 renders as cm³), hence volumeUnitLabel.
  const measurements = [
    { label: m.sample_field_length(), measurement: description.length },
    { label: m.sample_field_width(), measurement: description.width },
    { label: m.sample_field_thickness(), measurement: description.thickness },
    { label: m.sample_field_mass(), measurement: description.mass },
    {
      label: m.sample_field_volume(),
      measurement: description.volume && {
        ...description.volume,
        unit: volumeUnitLabel[description.volume.unit],
      },
    },
  ];
  return (
    <FieldRows>
      <FieldRow
        label={m.sample_field_collection_date()}
        value={
          description.collectionDate &&
          collectionDateText(description.collectionDate)
        }
      />
      <FieldRow
        label={m.sample_field_oriented()}
        value={
          description.oriented == null
            ? null
            : description.oriented
              ? m.sample_oriented_yes()
              : m.sample_oriented_no()
        }
      />
      <FieldRow
        label={m.sample_field_orientation_explanation()}
        value={description.orientationExplanation}
      />
      <FieldRow
        label={m.sample_field_open_description()}
        value={description.openDescription}
      />
      {measurements.map(({ label, measurement }) => (
        <FieldRow
          key={label}
          label={label}
          value={measurement && `${measurement.value} ${measurement.unit}`}
        />
      ))}
    </FieldRows>
  );
}
