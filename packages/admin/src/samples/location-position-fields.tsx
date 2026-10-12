import type { LocationType } from "@projet-igsn/domain/sample/location/location-type";

import type { LocationDraft } from "#/samples/compose-location.ts";

import { m } from "#/paraglide/messages.js";
import { LocationVerticalFields } from "#/samples/location-vertical-fields.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

type NumberKey = {
  [K in keyof LocationDraft]: LocationDraft[K] extends number | undefined
    ? K
    : never;
}[keyof LocationDraft];

type Label = () => string;

type PositionField = readonly [NumberKey, Label, Label];

type PositionRow = readonly [PositionField, ...PositionField[]];

const LONGITUDE_HINT = m.field_longitude_hint;
const LATITUDE_HINT = m.field_latitude_hint;

export const ROWS: Record<LocationType, readonly PositionRow[]> = {
  point: [
    [["longitude", m.field_longitude, LONGITUDE_HINT]],
    [["latitude", m.field_latitude, LATITUDE_HINT]],
  ],
  area: [
    [
      ["westLongitude", m.field_west_longitude, LONGITUDE_HINT],
      ["eastLongitude", m.field_east_longitude, LONGITUDE_HINT],
    ],
    [
      ["southLatitude", m.field_south_latitude, LATITUDE_HINT],
      ["northLatitude", m.field_north_latitude, LATITUDE_HINT],
    ],
  ],
  line: [
    [
      ["startLongitude", m.field_start_longitude, LONGITUDE_HINT],
      ["endLongitude", m.field_end_longitude, LONGITUDE_HINT],
    ],
    [
      ["startLatitude", m.field_start_latitude, LATITUDE_HINT],
      ["endLatitude", m.field_end_latitude, LATITUDE_HINT],
    ],
  ],
};

export function LocationPositionFields({ type }: { type: LocationType }) {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      {ROWS[type].map((row) => (
        <div
          key={row[0][0]}
          className="flex flex-wrap gap-4 [&>*]:w-full sm:[&>*]:w-auto"
        >
          {row.map(([name, label, hint]) => (
            <form.AppField key={name} name={`location.${name}`}>
              {(field) => <field.NumberField label={label()} hint={hint()} />}
            </form.AppField>
          ))}
        </div>
      ))}
      <LocationVerticalFields type={type} />
    </div>
  );
}
