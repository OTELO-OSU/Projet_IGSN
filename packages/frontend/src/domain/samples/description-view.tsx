import type { Description } from "@projet-igsn/domain/sample/description/model";

import { volumeUnitLabel } from "@projet-igsn/domain/sample/description/volume-unit";

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

// The description rows of the sample detail page, one per part actually
// present (every part of a Description is optional; the parent hides the
// whole section when the sample has none).
export function DescriptionView({ description }: { description: Description }) {
  const rows: { label: string; value: string }[] = [];
  if (description.collectionDate) {
    rows.push({
      label: m.sample_field_collection_date(),
      value: collectionDateText(description.collectionDate),
    });
  }
  if (description.oriented != null) {
    rows.push({
      label: m.sample_field_oriented(),
      value: description.oriented
        ? m.sample_oriented_yes()
        : m.sample_oriented_no(),
    });
  }
  if (description.orientationExplanation) {
    rows.push({
      label: m.sample_field_orientation_explanation(),
      value: description.orientationExplanation,
    });
  }
  if (description.openDescription) {
    rows.push({
      label: m.sample_field_open_description(),
      value: description.openDescription,
    });
  }
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
  for (const { label, measurement } of measurements) {
    if (measurement) {
      rows.push({
        label,
        value: `${measurement.value} ${measurement.unit}`,
      });
    }
  }
  return (
    <dl className="mt-2 divide-y">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex gap-4 px-4 py-3">
          <dt className="text-muted-foreground w-40">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
