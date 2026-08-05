import type { CreateSampleLink } from "@projet-igsn/domain/sample/link/model";
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
  doi_related_resources: string[];
};

const MATERIAL_PATH_SET = new Set(MATERIAL_PATHS);
const COLLECTION_METHOD_SET = new Set(COLLECTION_METHODS);
const SAMPLE_TYPE_SET = new Set(SAMPLE_TYPES);

// Trim free text to null when empty, matching the domain's freeText.min(1).
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseNumber(value: string | null | undefined): number {
  return value != null ? Number.parseFloat(value) : NaN;
}

function slugSegment(label: string): string {
  return label
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function slugPath(label: string): string {
  return label.split(">").map(slugSegment).filter(Boolean).join(".");
}

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

// Targets follow the domain expert's mapping table; the legacy values it leaves
// undecided (MechanicallyBroken, Meta-Carbonate, Meta-Ultramafic: "record to
// review") are absent here on purpose, so those rows keep skipping until
// reviewed.
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

// The legacy `Xenolithic` root mirrors the igneous and metamorphic families, so
// it roots at `rock.xenolithic_rock` and its inner family path goes through the
// same MATERIAL_SPECIALS remaps before being re-prefixed.
function classificationCandidate(classification: string): string {
  const path = slugPath(classification);
  const [root = "", ...rest] = path.split(".");
  if (root === "xenolithic") {
    const inner = ["rock", ...rest].join(".");
    const remapped = MATERIAL_SPECIALS[inner] ?? inner;
    return ["rock.xenolithic_rock", ...remapped.split(".").slice(1)].join(".");
  }
  const rooted = ROCK_FAMILIES.has(root) ? `rock.${path}` : path;
  return MATERIAL_SPECIALS[rooted] ?? rooted;
}

export function mapMaterial(
  classification: string | null,
  material: string | null,
): string | null {
  // We never fall back to the coarse material_id root here: a bare "rock" would
  // misrepresent a real classification.
  if (classification) {
    return longestValidPrefix(
      classificationCandidate(classification),
      MATERIAL_PATH_SET,
    );
  }
  if (material) {
    return MATERIAL_ROOT_BY_LEGACY[material.trim().toLowerCase()] ?? null;
  }
  return null;
}

// Skipped rows come in on a re-import once the tree or this script's mapping
// supports the path.
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
// `nature` (a physical form) or a `type` (a sampling taxonomy path).
export function mapResourceType(resourceType: string | null): {
  type: string | null;
  nature: CreateSample["nature"];
} {
  if (!resourceType) return { type: null, nature: "inapplicable" };
  const slug = slugSegment(resourceType);
  const nature = NATURES.includes(slug as CreateSample["nature"])
    ? (slug as CreateSample["nature"])
    : "inapplicable";
  const candidate = slug.startsWith("core_") ? `core.${slug.slice(5)}` : slug;
  const type =
    longestValidPrefix(candidate, SAMPLE_TYPE_SET) ??
    TYPE_SPECIALS[slug] ??
    null;
  return { type, nature };
}

// The legacy DOI-typed related resources are 19 citation groups, not usable
// verbatim: most rows carry the full citation instead of a DOI, five groups
// increment the DOI by one per sample (only the first resolves), one truncates
// it, and the Cabanes 1988 run points at unrelated articles. So no extraction:
// each group's prefix maps to its DOI, hand-verified against doi.org and
// Crossref on 2026-07-29. Dantas 2007, a thesis with no DOI, is absent on
// purpose until the geologists decide.
const DOI_URL_BY_CITATION_PREFIX: [string, string][] = [
  ["Alard, O., Lorand, J.P., Reisberg", "10.1093/petrology/egr038"],
  ["Baptiste, V., Tommasi,A. (2014)", "10.5194/se-5-1-2014"],
  [
    "Baptiste, V., Tommasi, A., Demouchy, S. (2012)",
    "10.1016/j.lithos.2012.05.001",
  ],
  [
    "Baptiste. V.. Tommasi. A.. Demouchy. S. (2012)",
    "10.1016/j.lithos.2012.05.001",
  ],
  ["Boudier,F., Baronnet,A., Mainprice,D.", "10.1093/petrology/egp049"],
  ["Cabanes,N., Mercier J.-C.C. (1988)", "10.3406/bulmi.1988.8071"],
  ["Cabannes, N., Mercier, J.-C.C. (1988)", "10.1007/BF00379746"],
  ["Chardelin, M., Tommasi, A., Padron-Navarta", "10.1093/petrology/egae081"],
  ["Demouchy, S., Tommasi, A. 2021", "10.1016/j.epsl.2021.117159"],
  ["Demouchy, S., Tommasi, A., Ionov", "10.1029/2018GC007931"],
  ["https://doi.org/10.17600/18002387", "10.17600/18002387"],
  ["James, D.E., Boyd, F.R., Schutt", "10.1029/2003GC000551"],
  ["James. D.E.. Boyd. F.R.. Schutt", "10.1029/2003GC000551"],
  ["Nicolas, A., Boudier, F., & Montigny", "10.1029/JB092iB01p00461"],
  [
    "Soustelle, V., Tommasi, A., Demouchy, S., Franz",
    "10.1016/j.tecto.2013.09.024",
  ],
  ["Tommasi, A & Mameri, L. (2020)", "10.5281/zenodo.3754078"],
  ["Tommasi, A., Mameri, L., & Godard", "10.1029/2020GC009138"],
  ["Zaffarana, C., Tommasi, A., Vauchez", "10.1016/j.tecto.2014.02.017"],
];

export function mapDoiLink(value: string): CreateSampleLink | null {
  const citation = value.trim();
  const entry = DOI_URL_BY_CITATION_PREFIX.find(([prefix]) =>
    citation.startsWith(prefix),
  );
  if (!entry) return null;
  const url = `https://doi.org/${entry[1]}`;
  return { url, description: citation === url ? null : citation };
}

export function droppedDoiLinks(values: string[]): string[] {
  return values.filter((value) => !mapDoiLink(value));
}

const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

const NAME_RE = /^\p{L}[\p{L} .'’-]*$/u;
const isName = (token: string): boolean =>
  NAME_RE.test(token) && !/\bet\s*\.?\s*al\b/i.test(token);

// A multi-word part before the comma means several people ("BRIOT Danielle,
// CANTAGREL Jean-Marie"), not one name, so it is not a segment.
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
  if (raw.includes("(") || raw.includes(")")) return { invalid: raw };

  const names = raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  return names.length > 0 && names.every(isNameSegment)
    ? { name: names.join("; "), orcid: null }
    : { invalid: raw };
}

// The dump only ever carries these three spellings (checked in the data).
const SIZE_UNIT_BY_LEGACY: Record<string, "cm" | "m"> = {
  cm: "cm",
  centimeter: "cm",
  meter: "m",
};

type ParsedSize =
  | { kind: "none" }
  | { kind: "numbers"; values: number[] }
  | { kind: "invalid"; raw: string };

const positiveNumber = (part: string): number => {
  // French decimal comma ("0,5"); replacing only the first keeps a
  // double-comma part ("2,1,2") unreadable, as it should be.
  const value = Number(part.trim().replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : NaN;
};

function parseSize(size: string | null): ParsedSize {
  const raw = size?.trim() ?? "";
  if (raw === "" || raw === "/") return { kind: "none" };
  const values = raw.split(/x/i).map(positiveNumber);
  if (values.some(Number.isNaN) || values.length > 3)
    return { kind: "invalid", raw };
  return { kind: "numbers", values };
}

export function mapSize(
  size: string | null,
  sizeUnit: string | null,
): Pick<
  NonNullable<CreateSample["description"]>,
  "length" | "width" | "thickness"
> {
  const parsed = parseSize(size);
  if (parsed.kind !== "numbers") return {};
  const unit = SIZE_UNIT_BY_LEGACY[sizeUnit?.trim().toLowerCase() ?? ""];
  if (!unit) return {};
  const [length, width, thickness] = parsed.values;
  return {
    length: { value: length!, unit },
    ...(width !== undefined ? { width: { value: width, unit } } : {}),
    ...(thickness !== undefined
      ? { thickness: { value: thickness, unit } }
      : {}),
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

function elevationUnit(value: string | null): "m" | "km" | undefined {
  return ELEVATION_UNIT_BY_LEGACY[value?.trim().toLowerCase() ?? ""];
}

export function mapElevation(row: LegacyRow): Elevation | null {
  const landUnit = elevationUnit(row.elevation_unit);
  const land = parseNumber(row.elevation);
  if (landUnit && Number.isFinite(land)) {
    const landEnd = parseNumber(row.elevation_end);
    const end = Number.isFinite(landEnd) ? landEnd : land;
    return {
      min: Math.min(land, end),
      max: Math.max(land, end),
      unit: landUnit,
      datum: null,
    };
  }
  const bathyUnit = elevationUnit(row.bathy_unit);
  const bathy = parseNumber(row.bathy);
  if (bathyUnit && Number.isFinite(bathy)) {
    // Bathymetry is a depth below sea level, so a negative elevation.
    return { min: -bathy, max: -bathy, unit: bathyUnit, datum: "msl" };
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
// St. Vincent).
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
  const min = parseNumber(row.age_min);
  const max = parseNumber(row.age_max);
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

// Reuses the same normalizers/maps as the mapping, so it never drifts from what
// the import would actually store.
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
  const size = parseSize(row.size);
  if (size.kind === "invalid") {
    issues.push({ field: "size", value: size.raw });
  } else if (
    size.kind === "numbers" &&
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
  const ageMin = parseNumber(row.age_min);
  const ageMax = parseNumber(row.age_max);
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

// Several legacy rows can cite the same paper on one sample, so links dedupe
// by url, first citation wins.
function mapDoiLinks(values: string[]): CreateSampleLink[] {
  const byUrl = new Map<string, CreateSampleLink>();
  for (const value of values) {
    const link = mapDoiLink(value);
    if (link && !byUrl.has(link.url)) byUrl.set(link.url, link);
  }
  return [...byUrl.values()];
}

export function toCreateSample(row: LegacyRow): CreateSample {
  const { type, nature } = mapResourceType(row.resource_type);
  const links = mapDoiLinks(row.doi_related_resources);
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
    ...(links.length > 0 ? { links } : {}),
  };
}

export type LegacyOwner = {
  email: string;
  firstname: string | null;
  name: string | null;
};

export function toOwner(row: LegacyRow): LegacyOwner | null {
  const email = clean(row.owner_email);
  if (!email) return null;
  return {
    email,
    firstname: clean(row.owner_first_name),
    name: clean(row.owner_last_name),
  };
}
