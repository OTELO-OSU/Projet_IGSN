import type { LocationType } from "@projet-igsn/domain/sample/location/location-type";

import { Fragment } from "react";

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

type CoordinateField = readonly [NumberKey, Label, Label];

type VerticalField = {
  key: NumberKey;
  label: Label;
  siblingKey?: NumberKey;
};

type PositionRow = {
  coordinates: readonly CoordinateField[];
  vertical: VerticalField;
};

const ROWS: Record<LocationType, readonly PositionRow[]> = {
  point: [
    {
      coordinates: [
        ["longitude", m.field_longitude, m.field_longitude_hint],
        ["latitude", m.field_latitude, m.field_latitude_hint],
      ],
      vertical: { key: "verticalPosition", label: m.field_vertical_position },
    },
  ],
  area: [
    {
      coordinates: [
        ["westLongitude", m.field_west_longitude, m.field_longitude_hint],
        ["southLatitude", m.field_south_latitude, m.field_latitude_hint],
      ],
      vertical: {
        key: "verticalPositionMin",
        siblingKey: "verticalPositionMax",
        label: m.field_vertical_position_min,
      },
    },
    {
      coordinates: [
        ["eastLongitude", m.field_east_longitude, m.field_longitude_hint],
        ["northLatitude", m.field_north_latitude, m.field_latitude_hint],
      ],
      vertical: {
        key: "verticalPositionMax",
        siblingKey: "verticalPositionMin",
        label: m.field_vertical_position_max,
      },
    },
  ],
  line: [
    {
      coordinates: [
        ["startLongitude", m.field_start_longitude, m.field_longitude_hint],
        ["startLatitude", m.field_start_latitude, m.field_latitude_hint],
      ],
      vertical: {
        key: "startVerticalPosition",
        siblingKey: "endVerticalPosition",
        label: m.field_start_vertical_position,
      },
    },
    {
      coordinates: [
        ["endLongitude", m.field_end_longitude, m.field_longitude_hint],
        ["endLatitude", m.field_end_latitude, m.field_latitude_hint],
      ],
      vertical: {
        key: "endVerticalPosition",
        siblingKey: "startVerticalPosition",
        label: m.field_end_vertical_position,
      },
    },
  ],
};

export function LocationPositionFields({
  type,
  requiredToPublish,
}: {
  type: LocationType;
  requiredToPublish: boolean;
}) {
  const form = useSampleForm();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {ROWS[type].map(
        ({ coordinates, vertical: { key, label, siblingKey } }) => (
          <Fragment key={key}>
            {coordinates.map(([name, coordinateLabel, hint]) => (
              <form.AppField key={name} name={`location.${name}`}>
                {(field) => (
                  <field.NumberField
                    label={coordinateLabel()}
                    requiredToPublish={requiredToPublish}
                    hint={hint()}
                  />
                )}
              </form.AppField>
            ))}
            <form.AppField name={`location.${key}`}>
              {(field) => (
                <form.Subscribe
                  selector={(state) =>
                    siblingKey !== undefined &&
                    state.values.location[siblingKey] !== undefined
                  }
                >
                  {(required) => (
                    <field.NumberField
                      label={label()}
                      requiredToPublish={required}
                      hint={m.field_vertical_position_hint()}
                    />
                  )}
                </form.Subscribe>
              )}
            </form.AppField>
          </Fragment>
        ),
      )}
      <LocationVerticalFields />
    </div>
  );
}
