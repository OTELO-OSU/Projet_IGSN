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

type Position = {
  coordinates: readonly PositionRow[];
  vertical: PositionRow;
};

const LONGITUDE_HINT = m.field_longitude_hint;
const LATITUDE_HINT = m.field_latitude_hint;
const VERTICAL_HINT = m.field_vertical_position_hint;

export const ROWS: Record<LocationType, Position> = {
  point: {
    coordinates: [
      [["longitude", m.field_longitude, LONGITUDE_HINT]],
      [["latitude", m.field_latitude, LATITUDE_HINT]],
    ],
    vertical: [["verticalPosition", m.field_vertical_position, VERTICAL_HINT]],
  },
  area: {
    coordinates: [
      [
        ["westLongitude", m.field_west_longitude, LONGITUDE_HINT],
        ["eastLongitude", m.field_east_longitude, LONGITUDE_HINT],
      ],
      [
        ["southLatitude", m.field_south_latitude, LATITUDE_HINT],
        ["northLatitude", m.field_north_latitude, LATITUDE_HINT],
      ],
    ],
    vertical: [
      ["verticalPositionMin", m.field_vertical_position_min, VERTICAL_HINT],
      ["verticalPositionMax", m.field_vertical_position_max, VERTICAL_HINT],
    ],
  },
  line: {
    coordinates: [
      [
        ["startLongitude", m.field_start_longitude, LONGITUDE_HINT],
        ["endLongitude", m.field_end_longitude, LONGITUDE_HINT],
      ],
      [
        ["startLatitude", m.field_start_latitude, LATITUDE_HINT],
        ["endLatitude", m.field_end_latitude, LATITUDE_HINT],
      ],
    ],
    vertical: [
      ["startVerticalPosition", m.field_start_vertical_position, VERTICAL_HINT],
      ["endVerticalPosition", m.field_end_vertical_position, VERTICAL_HINT],
    ],
  },
};

export function LocationPositionFields({ type }: { type: LocationType }) {
  const form = useSampleForm();
  const { coordinates, vertical } = ROWS[type];
  return (
    <div className="grid gap-4">
      {[...coordinates, vertical].map((row) => (
        <div
          key={row[0][0]}
          className="flex flex-wrap gap-4 [&>*]:w-full sm:[&>*]:w-auto"
        >
          {row.map(([name, label, hint]) => (
            <form.AppField key={name} name={`location.${name}`}>
              {(field) => <field.NumberField label={label()} hint={hint()} />}
            </form.AppField>
          ))}
          {row === vertical ? <LocationVerticalFields /> : null}
        </div>
      ))}
    </div>
  );
}
