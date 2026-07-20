import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { VerticalDatum } from "@projet-igsn/domain/sample/location/vertical-datum";

import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";
import { oceanSeaName } from "@projet-igsn/domain/sample/location/ocean-sea-label";

import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

// Exhaustive label map: a new datum fails to compile until it is translated.
const VERTICAL_DATUM_LABELS: Record<VerticalDatum, () => string> = {
  msl: m.vertical_datum_msl,
  wgs84: m.vertical_datum_wgs84,
  grs80: m.vertical_datum_grs80,
};

type Elevation = NonNullable<NonNullable<Location["position"]>["elevation"]>;

// "-2500 m (Mean sea level)" for a point (min === max), "100 – 200 m (...)"
// for a range. Signed: negative is below the datum (bathymetry). Publish
// blockers require a complete elevation, but the schema types the parts as
// nullish, so each piece is rendered only when present (never a literal "null").
const elevationText = ({ min, max, unit, datum }: Elevation): string => {
  const range =
    min != null && max != null && min !== max
      ? `${min} – ${max}`
      : String(min ?? max ?? "");
  const unitText = unit ? ` ${unit}` : "";
  const datumText = datum ? ` (${VERTICAL_DATUM_LABELS[datum]()})` : "";
  return `${range}${unitText}${datumText}`.trim();
};

// The location rows of the sample detail page, one per part actually present
// (every part of a Location is optional; the parent hides the whole section
// when the sample has none).
export function LocationView({ location }: { location: Location }) {
  const { position, region } = location;
  const rows: { label: string; value: string }[] = [];
  if (position?.type === "point") {
    rows.push(
      { label: m.sample_field_latitude(), value: String(position.latitude) },
      { label: m.sample_field_longitude(), value: String(position.longitude) },
    );
  }
  if (position?.type === "area") {
    rows.push(
      {
        label: m.sample_field_west_longitude(),
        value: String(position.westLongitude),
      },
      {
        label: m.sample_field_east_longitude(),
        value: String(position.eastLongitude),
      },
      {
        label: m.sample_field_south_latitude(),
        value: String(position.southLatitude),
      },
      {
        label: m.sample_field_north_latitude(),
        value: String(position.northLatitude),
      },
    );
  }
  if (position?.elevation) {
    rows.push({
      label: m.sample_field_elevation(),
      value: elevationText(position.elevation),
    });
  }
  if (region) {
    rows.push({
      label: m.sample_field_region(),
      // The leaf is optional ("ocean, unknown which"); fall back to the kind.
      value:
        region.kind === "continent"
          ? region.country
            ? countryLabel(region.country, getLocale())
            : m.region_kind_continent()
          : region.oceanSea
            ? oceanSeaName(region.oceanSea)
            : m.region_kind_ocean(),
    });
  }
  if (location.navigationType) {
    rows.push({
      label: m.sample_field_navigation_type(),
      // Navigation types are language-neutral codes (their own label).
      value: location.navigationType,
    });
  }
  if (location.localityName) {
    rows.push({
      label: m.sample_field_locality_name(),
      value: location.localityName,
    });
  }
  if (location.localityDescription) {
    rows.push({
      label: m.sample_field_locality_description(),
      value: location.localityDescription,
    });
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
