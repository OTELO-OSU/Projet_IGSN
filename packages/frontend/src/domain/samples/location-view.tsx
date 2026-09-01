import type { Location } from "@projet-igsn/domain/sample/location/model";

import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";
import { verticalValues } from "@projet-igsn/domain/sample/location/vertical-values";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import {
  oceanSeaLabel,
  verticalReferenceLabel,
  verticalReferenceSystemLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

type Position = NonNullable<Location["position"]>;

const VERTICAL_SEPARATORS = { point: "", area: " - ", line: " -> " };

const verticalText = (position: Position): string | undefined => {
  const present = verticalValues(position).filter((value) => value != null);
  return present.length > 0
    ? `${present.join(VERTICAL_SEPARATORS[position.type])} m`
    : undefined;
};

const coordinates = (
  position: Position,
): readonly (readonly [string, number])[] => {
  switch (position.type) {
    case "point":
      return [
        [m.sample_field_latitude(), position.latitude],
        [m.sample_field_longitude(), position.longitude],
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
        [m.sample_field_start_latitude(), position.startLatitude],
        [m.sample_field_end_longitude(), position.endLongitude],
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
  } = location;
  return (
    <FieldRows>
      {position &&
        coordinates(position).map(([label, value]) => (
          <FieldRow key={label} label={label} value={String(value)} />
        ))}
      <FieldRow
        label={m.sample_field_vertical_position()}
        value={position && verticalText(position)}
      />
      <FieldRow
        label={m.sample_field_vertical_reference()}
        value={
          position?.vertical?.reference &&
          verticalReferenceLabel(position.vertical.reference)
        }
      />
      <FieldRow
        label={m.sample_field_vertical_reference_system()}
        value={
          position?.vertical?.system &&
          verticalReferenceSystemLabel(position.vertical.system)
        }
      />
      <FieldRow
        label={m.sample_field_region()}
        value={
          region &&
          (region.kind === "continent"
            ? region.country
              ? countryLabel(region.country, getLocale())
              : m.region_kind_continent()
            : region.oceanSea
              ? oceanSeaLabel(region.oceanSea)
              : m.region_kind_ocean())
        }
      />
      <FieldRow
        label={m.sample_field_navigation_type()}
        value={navigationType}
      />
      <FieldRow label={m.sample_field_locality_name()} value={localityName} />
      <FieldRow
        label={m.sample_field_locality_description()}
        value={localityDescription}
      />
    </FieldRows>
  );
}
