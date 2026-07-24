import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

import { COLLECTION_METHODS } from "@projet-igsn/domain/sample/collection-method/vocabulary";
import {
  type Country,
  COUNTRIES,
} from "@projet-igsn/domain/sample/location/country";
import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";
import { navigationTypeSchema } from "@projet-igsn/domain/sample/location/navigation-type";
import { MATERIAL_PATHS } from "@projet-igsn/domain/sample/material/classification";
import { SAMPLE_TYPES } from "@projet-igsn/domain/sample/type/vocabulary";

// One joined row of the legacy igsn_resource, with its lookups resolved to
// their label strings by the SELECT in import-legacy.ts.
export type LegacyRow = {
  name: string;
  igsn: string;
  publish_date: Date | null;
  last_modified: Date;
  latitude: number | null;
  longitude: number | null;
  latitude_end: number | null;
  longitude_end: number | null;
  elevation: string | null;
  elevation_end: string | null;
  elevation_unit: string | null;
  bathy: string | null;
  bathy_unit: string | null;
  collection_start_date: string | null;
  collection_end_date: string | null;
  collector: string | null;
  cruise_field_prgm: string | null;
  field_name: string | null;
  purpose: string | null;
  resource_comment: string | null;
  size: string | null;
  size_unit: string | null;
  other_names: string | null;
  locality_description: string | null;
  location_text: string | null;
  location_description: string | null;
  collection_method_desc: string | null;
  material: string | null;
  classification: string | null;
  collection_method: string | null;
  resource_type: string | null;
  country: string | null;
  navigation_type: string | null;
  age_min: string | null;
  age_max: string | null;
  age_unit: string | null;
  geological_unit: string | null;
  geological_age: string | null;
};

const MATERIAL_PATH_SET = new Set(MATERIAL_PATHS);
const COLLECTION_METHOD_SET = new Set(COLLECTION_METHODS);
const SAMPLE_TYPE_SET = new Set(SAMPLE_TYPES);

// Trim free text to null when empty, matching the domain's freeText.min(1).
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// A single legacy label segment -> a snake_case code: split camelCase, then
// fold every run of non-alphanumerics to one underscore.
function slugSegment(label: string): string {
  return label
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// A legacy `>`-separated label path -> a dot-joined code path.
function slugPath(label: string): string {
  return label.split(">").map(slugSegment).filter(Boolean).join(".");
}

// The longest prefix of a dot path that is a valid vocabulary path, or null.
// Keeps as much of a legacy path as the new tree recognizes, dropping the rest.
function longestValidPrefix(path: string, valid: Set<string>): string | null {
  const segments = path.split(".");
  for (let length = segments.length; length > 0; length -= 1) {
    const candidate = segments.slice(0, length).join(".");
    if (valid.has(candidate)) return candidate;
  }
  return null;
}

// Legacy classification (the rock-type tree) is rooted at the family
// (Igneous, Metamorphic...) which lives under `rock.` in the new material tree.
const ROCK_FAMILIES = new Set([
  "igneous",
  "metamorphic",
  "sedimentary",
  "hydrothermal",
  "unknown",
]);

const MATERIAL_ROOT_BY_LEGACY: Record<string, string> = {
  rock: "rock",
  sediment: "sediment",
  mineral: "mineral",
};

// The legacy classification path slugged and rooted under `rock` for the rock
// families, e.g. `Igneous>Volcanic>Mafic` -> `rock.igneous.volcanic.mafic`.
function classificationCandidate(classification: string): string {
  const path = slugPath(classification);
  const root = path.split(".")[0] ?? "";
  return ROCK_FAMILIES.has(root) ? `rock.${path}` : path;
}

export function mapMaterial(
  classification: string | null,
  material: string | null,
): string | null {
  // A classification maps to its longest valid prefix (null if the new tree
  // lacks that branch, e.g. Xenolithic/Ore). We never fall back to the coarse
  // material_id root here: a bare "rock" would misrepresent a real classification.
  if (classification) {
    return longestValidPrefix(
      classificationCandidate(classification),
      MATERIAL_PATH_SET,
    );
  }
  // No classification: the coarse material_id root is the only signal, faithful
  // to a source that knew only "Rock"/"Sediment"/"Mineral".
  if (material) {
    return MATERIAL_ROOT_BY_LEGACY[material.trim().toLowerCase()] ?? null;
  }
  return null;
}

// A sample imports only when its material path matches the start of a complete
// path the tree supports: the slugged classification must be a valid node (a
// prefix of some complete leaf), incomplete or not, or a coarse material_id root.
// A path whose segment sequence the tree does not support is skipped: an
// unplaceable root (`Xenolithic`, `Ore`), or a leaf that is not a direct child at
// that position (`Metamorphic>Gneiss` -> `rock.metamorphic.gneiss`, since `gneiss`
// sits deeper), an unknown `material_id` (`Soil`), or no material at all. Skipped
// rows come in on a re-import once the tree or this script's mapping supports the
// path.
export function isKnownMaterialPath(
  classification: string | null,
  material: string | null,
): boolean {
  if (classification) {
    return MATERIAL_PATH_SET.has(classificationCandidate(classification));
  }
  if (material) {
    return MATERIAL_ROOT_BY_LEGACY[material.trim().toLowerCase()] !== undefined;
  }
  return false;
}

export function mapCollectionMethod(
  collectionMethod: string | null,
): string | null {
  if (!collectionMethod) return null;
  return longestValidPrefix(slugPath(collectionMethod), COLLECTION_METHOD_SET);
}

// Legacy resourceType is one flat label that in the new model is either a
// `nature` (a physical form) or a `type` (a sampling taxonomy path).
const NATURE_BY_RESOURCE_TYPE: Record<string, CreateSample["nature"]> = {
  "thin section": "thin_section",
  "thick section": "thick_section",
  "polished section": "polished_section",
  "rock powder": "rock_powder",
};

const TYPE_SPECIALS: Record<string, string> = {
  cuttings: "core.cuttings",
  individual_sample_in_core: "core.individual_sample_in_core",
};

export function mapResourceType(resourceType: string | null): {
  type: string | null;
  nature: CreateSample["nature"];
} {
  const normalized = resourceType?.trim().toLowerCase() ?? "";
  const nature = NATURE_BY_RESOURCE_TYPE[normalized] ?? "inapplicable";
  let type: string | null = null;
  if (resourceType) {
    const slug = slugSegment(resourceType);
    // "core X" is a two-level path (core.X); everything else is one segment.
    const candidate = slug.startsWith("core_") ? `core.${slug.slice(5)}` : slug;
    type =
      longestValidPrefix(candidate, SAMPLE_TYPE_SET) ??
      TYPE_SPECIALS[slug] ??
      null;
  }
  return { type, nature };
}

// Pull an ORCID iD out of a free-text collector field like
// "Jostein Bakke (ORCID:0000-0001-6114-0400)" and return the name without it.
const ORCID_PATTERN = /(\d{4}-\d{4}-\d{4}-\d{3}[\dx])/i;

export function extractCollector(collector: string | null): {
  name: string | null;
  orcid: string | null;
} {
  if (!collector) return { name: null, orcid: null };
  const match = collector.match(ORCID_PATTERN);
  const orcid = match?.[1]?.toUpperCase() ?? null;
  const name = clean(
    collector
      .replace(/\(?\s*orcid\s*:?\s*\d{4}-\d{4}-\d{4}-\d{3}[\dx]\s*\)?/i, "")
      .replace(/\(\s*\)\s*$/, ""),
  );
  return { name, orcid };
}

const SIZE_UNIT_BY_LEGACY: Record<string, "mm" | "cm" | "dm" | "m"> = {
  mm: "mm",
  millimeter: "mm",
  cm: "cm",
  centimeter: "cm",
  centimeters: "cm",
  dm: "dm",
  m: "m",
  meter: "m",
  meters: "m",
};

// Legacy `size` is either a single number (a length) or an "AxBxC" triple
// (length x width x thickness), in one unit. Non-positive/non-numeric parts drop
// (the measurement schema requires a positive value).
export function mapSize(
  size: string | null,
  sizeUnit: string | null,
): Pick<
  NonNullable<CreateSample["description"]>,
  "length" | "width" | "thickness"
> {
  const unit = SIZE_UNIT_BY_LEGACY[sizeUnit?.trim().toLowerCase() ?? ""];
  if (!unit || !size) return {};
  const values = size
    .split(/[x×*]/i)
    .map((part) => Number.parseFloat(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  const [length, width, thickness] = values;
  return {
    ...(length ? { length: { value: length, unit } } : {}),
    ...(width ? { width: { value: width, unit } } : {}),
    ...(thickness ? { thickness: { value: thickness, unit } } : {}),
  };
}

const ELEVATION_UNIT_BY_LEGACY: Record<string, "m" | "km"> = {
  m: "m",
  meter: "m",
  meters: "m",
  km: "km",
};

type Elevation = NonNullable<
  NonNullable<CreateSample["location"]>["position"]
>["elevation"];

// Signed elevation: land elevation is positive (above the datum), bathymetry is
// negative (below). Prefer land elevation; fall back to bathymetry as -depth
// with a mean-sea-level datum (ADR 0014).
export function mapElevation(row: LegacyRow): Elevation | null {
  const landUnit =
    ELEVATION_UNIT_BY_LEGACY[row.elevation_unit?.trim().toLowerCase() ?? ""];
  const land = row.elevation != null ? Number.parseFloat(row.elevation) : NaN;
  if (Number.isFinite(land) && landUnit) {
    const end =
      row.elevation_end != null ? Number.parseFloat(row.elevation_end) : NaN;
    const min = Math.round(land);
    const max = Number.isFinite(end) ? Math.round(end) : min;
    return {
      min: Math.min(min, max),
      max: Math.max(min, max),
      unit: landUnit,
      datum: null,
    };
  }
  const bathyUnit =
    ELEVATION_UNIT_BY_LEGACY[row.bathy_unit?.trim().toLowerCase() ?? ""];
  const bathy = row.bathy != null ? Number.parseFloat(row.bathy) : NaN;
  if (Number.isFinite(bathy) && bathyUnit) {
    const depth = -Math.round(bathy);
    return { min: depth, max: depth, unit: bathyUnit, datum: "msl" };
  }
  return null;
}

function inLongitude(value: number | null): value is number {
  return value != null && value >= -180 && value <= 180;
}

function inLatitude(value: number | null): value is number {
  return value != null && value >= -90 && value <= 90;
}

type Position = NonNullable<CreateSample["location"]>["position"];

export function mapPosition(row: LegacyRow): Position | null {
  if (!inLongitude(row.longitude) || !inLatitude(row.latitude)) return null;
  const elevation = mapElevation(row);
  const elevationPart = elevation ? { elevation } : {};
  if (
    inLongitude(row.longitude_end) &&
    inLatitude(row.latitude_end) &&
    (row.longitude_end !== row.longitude || row.latitude_end !== row.latitude)
  ) {
    return {
      type: "area",
      westLongitude: row.longitude,
      eastLongitude: row.longitude_end,
      southLatitude: Math.min(row.latitude, row.latitude_end),
      northLatitude: Math.max(row.latitude, row.latitude_end),
      ...elevationPart,
    };
  }
  return {
    type: "point",
    longitude: row.longitude,
    latitude: row.latitude,
    ...elevationPart,
  };
}

const normalizeCountry = (name: string): string =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

const COUNTRY_CODE_BY_NAME = new Map(
  COUNTRIES.map((code) => [normalizeCountry(countryLabel(code, "en")), code]),
);

export function mapCountry(country: string | null): Country | null {
  if (!country) return null;
  return COUNTRY_CODE_BY_NAME.get(normalizeCountry(country)) ?? null;
}

export function mapLocation(row: LegacyRow): CreateSample["location"] | null {
  const position = mapPosition(row);
  const country = mapCountry(row.country);
  // Navigation type only means anything with a position (ADR 0014), and only
  // when it matches a SESAR code verbatim.
  const parsedNav =
    position && row.navigation_type
      ? navigationTypeSchema.safeParse(row.navigation_type)
      : null;
  const navigationType = parsedNav?.success ? parsedNav.data : null;
  const localityName = clean(row.location_text);
  const localityDescription =
    clean(row.locality_description) ?? clean(row.location_description);
  const location = {
    ...(position ? { position } : {}),
    ...(country ? { region: { kind: "continent" as const, country } } : {}),
    ...(navigationType ? { navigationType } : {}),
    ...(localityName ? { localityName } : {}),
    ...(localityDescription ? { localityDescription } : {}),
  };
  return Object.keys(location).length > 0 ? location : null;
}

export function mapDescription(
  row: LegacyRow,
): CreateSample["description"] | null {
  const collectionDate = mapCollectionDate(
    row.collection_start_date,
    row.collection_end_date,
  );
  const openDescription = clean(row.resource_comment);
  const description = {
    ...(collectionDate ? { collectionDate } : {}),
    ...(openDescription ? { openDescription } : {}),
    ...mapSize(row.size, row.size_unit),
  };
  return Object.keys(description).length > 0 ? description : null;
}

function mapCollectionDate(
  start: string | null,
  end: string | null,
): { start: string; end: string } | null {
  const first = start ?? end;
  const last = end ?? start;
  if (!first || !last) return null;
  return first <= last
    ? { start: first, end: last }
    : { start: last, end: first };
}

type NumericAge = Pick<
  NonNullable<CreateSample["age"]>,
  "numericAgeUnit" | "numericAgeYearsUnit"
>;

const AGE_UNIT_BY_LEGACY: Record<string, NumericAge> = {
  ma: { numericAgeUnit: "ma", numericAgeYearsUnit: null },
  ga: { numericAgeUnit: "ga", numericAgeYearsUnit: null },
  ka: { numericAgeUnit: "ka", numericAgeYearsUnit: null },
  ky: { numericAgeUnit: "ka", numericAgeYearsUnit: null },
  a: { numericAgeUnit: "a", numericAgeYearsUnit: null },
  y: { numericAgeUnit: "a", numericAgeYearsUnit: null },
  year: { numericAgeUnit: "a", numericAgeYearsUnit: null },
  years: { numericAgeUnit: "a", numericAgeYearsUnit: null },
  ad: { numericAgeUnit: "a", numericAgeYearsUnit: "ce" },
  bp: { numericAgeUnit: "a", numericAgeYearsUnit: "bp" },
  "year bp": { numericAgeUnit: "a", numericAgeYearsUnit: "bp" },
};

export function mapAge(row: LegacyRow): CreateSample["age"] | null {
  const min = row.age_min != null ? Number.parseFloat(row.age_min) : NaN;
  const max = row.age_max != null ? Number.parseFloat(row.age_max) : NaN;
  const hasNumeric = Number.isFinite(min) || Number.isFinite(max);
  const geologicalUnit = clean(row.geological_unit);
  if (!hasNumeric && !geologicalUnit) return null;
  let numericMin = Number.isFinite(min)
    ? min
    : Number.isFinite(max)
      ? max
      : null;
  let numericMax = Number.isFinite(max)
    ? max
    : Number.isFinite(min)
      ? min
      : null;
  if (numericMin != null && numericMax != null && numericMin > numericMax) {
    [numericMin, numericMax] = [numericMax, numericMin];
  }
  const unit = hasNumeric
    ? AGE_UNIT_BY_LEGACY[row.age_unit?.trim().toLowerCase() ?? ""]
    : undefined;
  return {
    numericAgeMin: hasNumeric ? numericMin : null,
    numericAgeMax: hasNumeric ? numericMax : null,
    numericAgeUnit: unit?.numericAgeUnit ?? null,
    numericAgeYearsUnit: unit?.numericAgeYearsUnit ?? null,
    geologicalAgeMin: null,
    geologicalAgeMax: null,
    geologicalUnit,
  };
}

export function mapScientificContext(row: LegacyRow): ScientificContext | null {
  const { name: collectorName, orcid: collectorOrcid } = extractCollector(
    row.collector,
  );
  const researchCampaign = clean(row.cruise_field_prgm);
  const fieldName = clean(row.field_name);
  const missionDescription = clean(row.purpose);
  if (
    !collectorName &&
    !collectorOrcid &&
    !researchCampaign &&
    !fieldName &&
    !missionDescription
  ) {
    return null;
  }
  return {
    provenanceStatus: "recent_collection",
    ...(collectorName ? { collectorName } : {}),
    ...(collectorOrcid ? { collectorOrcid } : {}),
    ...(researchCampaign ? { researchCampaign } : {}),
    ...(fieldName ? { fieldName } : {}),
    ...(missionDescription ? { missionDescription } : {}),
  };
}

// A legacy row -> the new create payload. Every field is best-effort: an
// unmappable vocabulary value or missing part is simply left off, so the sample
// still imports (validated by createSampleSchema in import-legacy.ts).
export function toCreateSample(row: LegacyRow): CreateSample {
  const { type, nature } = mapResourceType(row.resource_type);
  return {
    name: row.name.trim(),
    nature,
    type,
    material: mapMaterial(row.classification, row.material),
    collectionMethod: mapCollectionMethod(row.collection_method),
    collectionMethodDescription: clean(row.collection_method_desc),
    specificName: clean(row.other_names),
    location: mapLocation(row),
    description: mapDescription(row),
    scientificContext: mapScientificContext(row),
    age: mapAge(row),
  };
}
