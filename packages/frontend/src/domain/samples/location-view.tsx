import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { VerticalDatum } from "@projet-igsn/domain/sample/location/vertical-datum";

import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { oceanSeaLabel } from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

const VERTICAL_DATUM_LABELS: Record<VerticalDatum, () => string> = {
  msl: m.vertical_datum_msl,
  wgs84: m.vertical_datum_wgs84,
  grs80: m.vertical_datum_grs80,
};

type Elevation = NonNullable<NonNullable<Location["position"]>["elevation"]>;

const elevationText = ({ min, max, unit, datum }: Elevation): string => {
  const range =
    min != null && max != null && min !== max
      ? `${min} - ${max}`
      : String(min ?? max ?? "");
  const unitText = unit ? ` ${unit}` : "";
  const datumText = datum ? ` (${VERTICAL_DATUM_LABELS[datum]()})` : "";
  return `${range}${unitText}${datumText}`.trim();
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
      {position?.type === "point" && (
        <>
          <FieldRow
            label={m.sample_field_latitude()}
            value={String(position.latitude)}
          />
          <FieldRow
            label={m.sample_field_longitude()}
            value={String(position.longitude)}
          />
        </>
      )}
      {position?.type === "area" && (
        <>
          <FieldRow
            label={m.sample_field_west_longitude()}
            value={String(position.westLongitude)}
          />
          <FieldRow
            label={m.sample_field_east_longitude()}
            value={String(position.eastLongitude)}
          />
          <FieldRow
            label={m.sample_field_south_latitude()}
            value={String(position.southLatitude)}
          />
          <FieldRow
            label={m.sample_field_north_latitude()}
            value={String(position.northLatitude)}
          />
        </>
      )}
      <FieldRow
        label={m.sample_field_elevation()}
        value={position?.elevation && elevationText(position.elevation)}
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
