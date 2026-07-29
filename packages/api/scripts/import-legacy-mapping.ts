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
import { NATURES } from "@projet-igsn/domain/sample/nature";
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
  owner_email: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
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

// Legacy metamorphic/sedimentary leaves whose node in the new tree carries a
// different code or sits deeper (a grade or sub-family level the legacy path
// lacks), keyed by the rooted slug. Targets follow the domain expert's mapping
// table; the legacy values it leaves undecided (MechanicallyBroken,
// Meta-Carbonate, Meta-Ultramafic: "record to review") are absent here on
// purpose, so those rows keep skipping until reviewed.
const MATERIAL_SPECIALS: Record<string, string> = {
  "rock.metamorphic.calc_silicate":
    "rock.metamorphic.strongly_metamorphosed.calc_silicate_rock",
  "rock.metamorphic.gneiss": "rock.metamorphic.strongly_metamorphosed.gneiss",
  "rock.metamorphic.granofels":
    "rock.metamorphic.strongly_metamorphosed.granofels",
  "rock.metamorphic.granulite":
    "rock.metamorphic.strongly_metamorphosed.granulite",
  "rock.metamorphic.schist": "rock.metamorphic.strongly_metamorphosed.schist",
  "rock.metamorphic.slate": "rock.metamorphic.strongly_metamorphosed.slate",
  "rock.sedimentary.carbonate":
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock",
  "rock.sedimentary.conglomerate_and_or_breccia":
    "rock.sedimentary.clastic_sedimentary_rock.paraconglomerate",
  "rock.sedimentary.ironstone":
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.ironstone",
  "rock.sedimentary.mixed_carb_siliciclastic":
    "rock.sedimentary.hybrid_sedimentary_rock",
  "rock.sedimentary.siliceous_biogenic":
    "rock.sedimentary.hybrid_sedimentary_rock",
  "rock.sedimentary.siliciclastic":
    "rock.sedimentary.clastic_sedimentary_rock.siliciclastic_sedimentary_rock",
  "rock.sedimentary.volcaniclastic": "rock.sedimentary.volcaniclastic_rock",
};

// The legacy classification path slugged and rooted under `rock` for the rock
// families, e.g. `Igneous>Volcanic>Mafic` -> `rock.igneous.volcanic.mafic`,
// then remapped when the legacy leaf sits elsewhere in the new tree.
function classificationCandidate(classification: string): string {
  const path = slugPath(classification);
  const root = path.split(".")[0] ?? "";
  const rooted = ROCK_FAMILIES.has(root) ? `rock.${path}` : path;
  return MATERIAL_SPECIALS[rooted] ?? rooted;
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
// path the tree supports: the slugged classification (after MATERIAL_SPECIALS)
// must be a valid node (a prefix of some complete leaf), incomplete or not, or a
// coarse material_id root. A path whose segment sequence the tree does not
// support is skipped: an unplaceable root (`Xenolithic`, `Ore`), a leaf with no
// node and no MATERIAL_SPECIALS entry, an unknown `material_id` (`Soil`), or no
// material at all. Skipped rows come in on a re-import once the tree or this
// script's mapping supports the path.
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

// Flat legacy `type` labels that nest under `core` in the new tree but arrive
// without the prefix, so slugging them yields a bare segment the tree lacks.
const TYPE_SPECIALS: Record<string, string> = {
  cuttings: "core.cuttings",
  individual_sample_in_core: "core.individual_sample_in_core",
};

// Legacy resourceType is one flat label that in the new model is either a
// `nature` (a physical form) or a `type` (a sampling taxonomy path). Its slug
// already equals the target code, so a nature is just "this slug is a NATURES
// member"; anything else is looked up in the type tree.
export function mapResourceType(resourceType: string | null): {
  type: string | null;
  nature: CreateSample["nature"];
} {
  if (!resourceType) return { type: null, nature: "inapplicable" };
  const slug = slugSegment(resourceType);
  const nature = NATURES.includes(slug as CreateSample["nature"])
    ? (slug as CreateSample["nature"])
    : "inapplicable";
  // "core X" is a two-level path (core.X); everything else is one segment.
  const candidate = slug.startsWith("core_") ? `core.${slug.slice(5)}` : slug;
  const type =
    longestValidPrefix(candidate, SAMPLE_TYPE_SET) ??
    TYPE_SPECIALS[slug] ??
    null;
  return { type, nature };
}

const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

// One person or organization name: letters (any script, with diacritics),
// spaces, hyphens, apostrophes and dots (initials). No commas, digits, or an
// "et al." placeholder, so an open-ended list is not a name.
const NAME_RE = /^\p{L}[\p{L} .'’-]*$/u;
const isName = (token: string): boolean =>
  NAME_RE.test(token) && !/\bet\s*\.?\s*al\b/i.test(token);

// One collector: a plain name, or the "Surname, Firstname" form (exactly one
// comma; the surname before it is a single token). A multi-word part before the
// comma means several people ("BRIOT Danielle, CANTAGREL Jean-Marie"), not one
// name, so it is not a segment.
const isNameSegment = (segment: string): boolean => {
  if (isName(segment)) return true;
  const [surname, firstname, ...rest] = segment.split(",");
  return (
    rest.length === 0 &&
    firstname !== undefined &&
    isName(surname!.trim()) &&
    !/\s/.test(surname!.trim()) &&
    isName(firstname.trim())
  );
};

export type ParsedCollector =
  | { name: string | null; orcid: string | null }
  | { invalid: string };

// A legacy `collector` is a name ("Firstname Last" or "Surname, Firstname"), an
// organization, several such names separated by `;`, any of these optionally
// trailed by "(ORCID: ....)", or empty. Anything else (an open-ended "et al."
// list, a segment with more than one comma, a malformed ORCID, stray
// punctuation) we cannot read with confidence, so it is returned invalid for the
// import to skip and log rather than mangle into a name.
export function parseCollector(collector: string | null): ParsedCollector {
  const raw = collector?.trim() ?? "";
  if (raw === "") return { name: null, orcid: null };

  const orcidForm = raw.match(/^(.*?)\s*\(\s*orcid:?\s*([^)]*)\)\s*$/i);
  if (orcidForm) {
    const name = orcidForm[1]!.trim();
    const orcid = orcidForm[2]!.trim().toUpperCase();
    return isNameSegment(name) && ORCID_RE.test(orcid)
      ? { name, orcid }
      : { invalid: raw };
  }
  // Any other parenthesis is a shape we do not recognize.
  if (raw.includes("(") || raw.includes(")")) return { invalid: raw };

  const names = raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  return names.length > 0 && names.every(isNameSegment)
    ? { name: names.join("; "), orcid: null }
    : { invalid: raw };
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

// Legacy `size` is an "AxBxC" triple in length x width x thickness order, one
// positive number, `/` (no value), or something we cannot read as a measurement
// (free text, a two-value pair). We don't know which dimension a bare number is,
// so it fills all three; anything else is rejected for review (see
// unmappableValues) rather than guessed.
type ParsedSize =
  | { kind: "none" }
  | { kind: "dimensions"; length: number; width: number; thickness: number }
  | { kind: "invalid"; raw: string };

const positiveNumber = (part: string): number => {
  const value = Number(part.trim());
  return Number.isFinite(value) && value > 0 ? value : NaN;
};

function parseSize(size: string | null): ParsedSize {
  const raw = size?.trim() ?? "";
  if (raw === "" || raw === "/") return { kind: "none" };
  const parts = raw.split(/x/i).map(positiveNumber);
  const [first, second, third] = parts;
  if (parts.some(Number.isNaN)) return { kind: "invalid", raw };
  if (parts.length === 1)
    return {
      kind: "dimensions",
      length: first!,
      width: first!,
      thickness: first!,
    };
  if (parts.length === 3)
    return {
      kind: "dimensions",
      length: first!,
      width: second!,
      thickness: third!,
    };
  return { kind: "invalid", raw };
}

export function mapSize(
  size: string | null,
  sizeUnit: string | null,
): Pick<
  NonNullable<CreateSample["description"]>,
  "length" | "width" | "thickness"
> {
  const unit = SIZE_UNIT_BY_LEGACY[sizeUnit?.trim().toLowerCase() ?? ""];
  const parsed = parseSize(size);
  if (parsed.kind !== "dimensions" || !unit) return {};
  return {
    length: { value: parsed.length, unit },
    width: { value: parsed.width, unit },
    thickness: { value: parsed.thickness, unit },
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

// Fold accents (é -> e) before stripping punctuation, so a legacy "Reunion"
// matches the ICU label "Réunion" (and any other accented country name).
const normalizeCountry = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

// Legacy names ICU's English label does not match: endonyms (Deutschland),
// a former name (Swaziland -> Eswatini), or a different phrasing (Congo DRC,
// St. Vincent). Each code already exists in COUNTRIES; only the label differs.
const COUNTRY_ALIASES: Record<string, Country> = {
  "Congo, The Democratic Republic Of The": "CD",
  Deutschland: "DE",
  Italia: "IT",
  Slovenija: "SI",
  Swaziland: "SZ",
  Turkey: "TR",
  "Saint Vincent And The Grenadines": "VC",
};

const COUNTRY_CODE_BY_NAME = new Map<string, Country>([
  ...COUNTRIES.map(
    (code) => [normalizeCountry(countryLabel(code, "en")), code] as const,
  ),
  ...Object.entries(COUNTRY_ALIASES).map(
    ([name, code]) => [normalizeCountry(name), code] as const,
  ),
]);

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
  // An unreadable collector skips the row (see unmappableValues), so here it
  // simply carries no collector.
  const collector = parseCollector(row.collector);
  const collectorName = "invalid" in collector ? null : collector.name;
  const collectorOrcid = "invalid" in collector ? null : collector.orcid;
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

// Every field a legacy row feeds through one of our enums / controlled lists.
// A value that does not normalize into the enum must not be stored (it would
// defeat the enum), and we will not silently publish a sample that lost it, so
// the sample is skipped whole and the offending value logged for review.
export type SkipField =
  | "material"
  | "collection_method"
  | "resource_type"
  | "country"
  | "navigation_type"
  | "collector"
  | "size"
  | "size_unit"
  | "elevation_unit"
  | "bathy_unit"
  | "age_unit";

export type SkipIssue = { field: SkipField; value: string };

// Every controlled value in the row that cannot be placed in its enum, so a
// caller can skip the sample and log each offending value. Empty = importable.
// Reuses the same normalizers/maps as the mapping, so it never drifts from what
// the import would actually store. Units are flagged only when their paired
// measurement is present (a stray unit with no value carries nothing to lose).
export function unmappableValues(row: LegacyRow): SkipIssue[] {
  const issues: SkipIssue[] = [];
  const norm = (value: string) => value.trim().toLowerCase();

  if (!isKnownMaterialPath(row.classification, row.material)) {
    issues.push({
      field: "material",
      value: row.classification ?? row.material ?? "(none)",
    });
  }
  if (row.collection_method && !mapCollectionMethod(row.collection_method)) {
    issues.push({ field: "collection_method", value: row.collection_method });
  }
  const { type, nature } = mapResourceType(row.resource_type);
  if (row.resource_type && !type && nature === "inapplicable") {
    issues.push({ field: "resource_type", value: row.resource_type });
  }
  if (row.country && !mapCountry(row.country)) {
    issues.push({ field: "country", value: row.country });
  }
  if (
    row.navigation_type &&
    !navigationTypeSchema.safeParse(row.navigation_type).success
  ) {
    issues.push({ field: "navigation_type", value: row.navigation_type });
  }
  const collector = parseCollector(row.collector);
  if ("invalid" in collector) {
    issues.push({ field: "collector", value: collector.invalid });
  }
  // A size we can read as neither a single number nor an "AxBxC" triple is
  // rejected; a readable size needs a usable unit.
  const size = parseSize(row.size);
  if (size.kind === "invalid") {
    issues.push({ field: "size", value: size.raw });
  } else if (
    size.kind === "dimensions" &&
    row.size_unit &&
    !SIZE_UNIT_BY_LEGACY[norm(row.size_unit)]
  ) {
    issues.push({ field: "size_unit", value: row.size_unit });
  }
  if (
    row.elevation?.trim() &&
    row.elevation_unit &&
    !ELEVATION_UNIT_BY_LEGACY[norm(row.elevation_unit)]
  ) {
    issues.push({ field: "elevation_unit", value: row.elevation_unit });
  }
  if (
    row.bathy?.trim() &&
    row.bathy_unit &&
    !ELEVATION_UNIT_BY_LEGACY[norm(row.bathy_unit)]
  ) {
    issues.push({ field: "bathy_unit", value: row.bathy_unit });
  }
  const ageMin = row.age_min != null ? Number.parseFloat(row.age_min) : NaN;
  const ageMax = row.age_max != null ? Number.parseFloat(row.age_max) : NaN;
  const hasNumericAge = Number.isFinite(ageMin) || Number.isFinite(ageMax);
  if (
    hasNumericAge &&
    row.age_unit &&
    !AGE_UNIT_BY_LEGACY[norm(row.age_unit)]
  ) {
    issues.push({ field: "age_unit", value: row.age_unit });
  }
  return issues;
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

export type LegacyOwner = {
  email: string;
  firstname: string | null;
  name: string | null;
};

// The legacy owner account, or null when the row carries none.
export function toOwner(row: LegacyRow): LegacyOwner | null {
  const email = clean(row.owner_email);
  if (!email) return null;
  return {
    email,
    firstname: clean(row.owner_first_name),
    name: clean(row.owner_last_name),
  };
}
