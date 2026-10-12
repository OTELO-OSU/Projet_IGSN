import type {
  Location,
  VerticalPosition,
} from "@projet-igsn/domain/sample/location/model";

import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import {
  oceanSeaLabel,
  verticalReferenceLabel,
  verticalReferenceSystemLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

type Position = NonNullable<Location["position"]>;

const verticalText = (
  { start, end, system }: VerticalPosition,
  position: Position,
): string | undefined => {
  const values = [...new Set([start, end].filter((value) => value != null))];
  if (values.length === 0) return undefined;
  const range = values.join(position.type === "line" ? " -> " : " - ");
  return system
    ? `${range} m (${verticalReferenceSystemLabel(system)})`
    : `${range} m`;
};

const coordinates = (
  position: Position,
): readonly (readonly [string, number])[] => {
  switch (position.type) {
    case "point":
      return [
        [m.sample_field_longitude(), position.longitude],
        [m.sample_field_latitude(), position.latitude],
      ];
    case "area":
      return [
        [m.sample_field_west_longitude(), position.westLongitude],
        [m.sample_field_east_longitude(), position.eastLongitude],
        [m.sample_field_south_latitude(), position.southLatitude],
        [m.sample_field_north_latitude(), position.northLatitude],
      ];
    case "line":
      return [
        [m.sample_field_start_longitude(), position.startLongitude],
        [m.sample_field_end_longitude(), position.endLongitude],
        [m.sample_field_start_latitude(), position.startLatitude],
        [m.sample_field_end_latitude(), position.endLatitude],
      ];
  }
};

export function LocationView({ location }: { location: Location }) {
  const {
    position,
    region,
    navigationType,
    localityName,
    localityDescription,
    verticalPositions,
  } = location;
  return (
    <FieldRows>
      {position &&
        coordinates(position).map(([label, value]) => (
          <FieldRow key={label} label={label} value={String(value)} />
        ))}
      {position &&
        verticalPositions?.map((entry, index) => (
          <FieldRow
            key={entry.reference ?? index}
            label={
              entry.reference
                ? verticalReferenceLabel(entry.reference)
                : m.sample_field_vertical_position()
            }
            value={verticalText(entry, position)}
          />
        ))}
      <FieldRow
        label={m.sample_field_navigation_type()}
        value={navigationType}
      />
      <FieldRow
        label={m.sample_field_region()}
        value={
          region &&
          (region.kind === "country"
            ? region.country
              ? countryLabel(region.country, getLocale())
              : m.region_kind_country()
            : region.oceanSea
              ? oceanSeaLabel(region.oceanSea)
              : m.region_kind_ocean())
        }
      />
      <FieldRow label={m.sample_field_locality_name()} value={localityName} />
      <FieldRow
        label={m.sample_field_locality_description()}
        value={localityDescription}
      />
    </FieldRows>
  );
}
