import type { Description } from "../description/model.ts";
import type { Location } from "../location/model.ts";
import type { CreateSample, Sample } from "../sample.ts";
import type { ScientificContext } from "../scientific-context/model.ts";
import type { ProvenanceStatus } from "../scientific-context/provenance-status.ts";

import { locationRequirement } from "../location/location-requirement.ts";
import { isPathAtOrUnder } from "../path/is-at-or-under.ts";
import { frozenMaterialPrefix } from "./frozen-material-prefix.ts";

const LOCKED_SAMPLE_FIELDS_TO_FORM_FIELDS = {
  name: ["name"],
  nature: ["nature"],
  type: ["typePath"],
} as const;
const LOCKED_LOCATION_FIELDS_TO_FORM_FIELDS = {
  position: [
    "location.type",
    "location.longitude",
    "location.latitude",
    "location.westLongitude",
    "location.eastLongitude",
    "location.southLatitude",
    "location.northLatitude",
  ],
  region: ["location.regionKind", "location.country", "location.oceanSea"],
} as const;
const LOCKED_DESCRIPTION_FIELDS_TO_FORM_FIELDS = {
  collectionDate: [
    "description.collectionDateStart",
    "description.collectionDateEnd",
  ],
} as const;
const LOCKED_RECENT_COLLECTION_FIELDS_TO_FORM_FIELDS = {
  funderOrganization: ["scientificContext.funderOrganization"],
  researchProgramName: ["scientificContext.researchProgramName"],
  researchProgramChief: ["scientificContext.researchProgramChief"],
  researchProgramChiefOrcid: ["scientificContext.researchProgramChiefOrcid"],
  collectorName: ["scientificContext.collectorName"],
} as const;
const LOCKED_HISTORICAL_SPECIMEN_FIELDS_TO_FORM_FIELDS = {
  collectionCurator: ["scientificContext.collectionCurator"],
  collectionOrigin: ["scientificContext.collectionOrigin"],
} as const;

const PROVENANCE_DISCRIMINANT_FORM_FIELD =
  "scientificContext.provenanceStatus" as const;

export const FROZEN_FORM_FIELDS: readonly string[] = [
  ...Object.values(LOCKED_SAMPLE_FIELDS_TO_FORM_FIELDS).flat(),
  ...Object.values(LOCKED_LOCATION_FIELDS_TO_FORM_FIELDS).flat(),
  ...Object.values(LOCKED_DESCRIPTION_FIELDS_TO_FORM_FIELDS).flat(),
  PROVENANCE_DISCRIMINANT_FORM_FIELD,
];

export const FROZEN_FORM_FIELDS_BY_PROVENANCE: Record<
  ProvenanceStatus,
  readonly string[]
> = {
  recent_collection: Object.values(
    LOCKED_RECENT_COLLECTION_FIELDS_TO_FORM_FIELDS,
  ).flat(),
  historical_specimen: Object.values(
    LOCKED_HISTORICAL_SPECIMEN_FIELDS_TO_FORM_FIELDS,
  ).flat(),
};

// The depth down to which each per-level hierarchy form field is frozen, for the
// admin form kit (which knows the `name[index]` format but not what a level
// means). Infinity: no material, or a wholly frozen one, so every level locks.
export function frozenHierarchyDepths(
  material: Sample["material"],
): Record<string, number> {
  return {
    materialPath: frozenMaterialPrefix(material)?.split(".").length ?? Infinity,
  };
}

type RecentCollection = Extract<
  ScientificContext,
  { provenanceStatus: "recent_collection" }
>;
type HistoricalSpecimen = Extract<
  ScientificContext,
  { provenanceStatus: "historical_specimen" }
>;

function freezeLocked<T extends object, K extends keyof T & string>(
  incoming: T,
  current: Pick<T, NoInfer<K>>,
  locked: Record<K, readonly string[]>,
): T {
  const frozen: Partial<T> = {};
  for (const key of Object.keys(locked) as K[]) frozen[key] = current[key];
  return { ...incoming, ...frozen };
}

function mergeLocation(
  current: Sample,
  incoming: CreateSample["location"],
  material: Sample["material"],
): Location | null {
  // The merged material also decides whether a location may exist at all: a
  // synthetic sample derives it from the structure ROR (ADR 0014), so its
  // editable leaves must not bring one back.
  if (locationRequirement(material) === "forbidden") return null;
  const payload: Location = { ...incoming };
  const merged = freezeLocked(
    payload,
    {
      position: current.location?.position ?? null,
      region: current.location?.region ?? null,
    },
    LOCKED_LOCATION_FIELDS_TO_FORM_FIELDS,
  );
  // The elevation is the one editable leaf inside the frozen position, and the
  // navigation type records how those coordinates were fixed: both are
  // meaningless without a frozen position, so they drop when there is none.
  const position = merged.position
    ? { ...merged.position, elevation: payload.position?.elevation ?? null }
    : null;
  const navigationType = position ? merged.navigationType : null;
  if (
    position == null &&
    merged.region == null &&
    merged.localityName == null &&
    merged.localityDescription == null
  ) {
    return null;
  }
  return { ...merged, position, navigationType };
}

// The coarse classification is the frozen citable identity, deeper levels stay
// refinable (ADR 0022).
function mergeMaterial(
  current: Sample["material"],
  incoming: CreateSample["material"],
): Sample["material"] {
  const frozen = frozenMaterialPrefix(current);
  if (frozen == null || incoming == null) return current;
  return isPathAtOrUnder(incoming, frozen) ? incoming : current;
}

function mergeDescription(
  current: Sample["description"],
  incoming: CreateSample["description"],
): Description {
  const payload: Description = { ...incoming };
  return freezeLocked(
    payload,
    { collectionDate: current?.collectionDate ?? null },
    LOCKED_DESCRIPTION_FIELDS_TO_FORM_FIELDS,
  );
}

function mergeScientificContext(
  current: Sample["scientificContext"],
  incoming: CreateSample["scientificContext"],
): ScientificContext | null {
  if (current == null) {
    // No frozen provenance to preserve: defensively keep null rather than adopt
    // the payload's branch (a published sample always has one).
    return null;
  }
  // The editable leaves are only trusted on the stored branch, so a payload
  // that flips the provenance status reads as "no edit": the stored context is
  // kept whole, rather than rebuilt from the mismatched branch (which would
  // wipe the editable leaves it cannot describe).
  if (current.provenanceStatus === "recent_collection") {
    if (incoming?.provenanceStatus !== "recent_collection") return current;
    const payload: RecentCollection = { ...incoming };
    return freezeLocked(
      payload,
      current,
      LOCKED_RECENT_COLLECTION_FIELDS_TO_FORM_FIELDS,
    );
  }
  if (incoming?.provenanceStatus !== "historical_specimen") return current;
  const payload: HistoricalSpecimen = { ...incoming };
  return freezeLocked(
    payload,
    current,
    LOCKED_HISTORICAL_SPECIMEN_FIELDS_TO_FORM_FIELDS,
  );
}

// texture and facies are editable, but only valid for their material's branch
// (createSampleSchema refines them against it) and nothing re-validates the
// merge output.
function mergeMaterialDependent(
  current: Sample,
  incoming: CreateSample,
  material: Sample["material"],
): CreateSample {
  if (incoming.material === material) return incoming;
  return {
    ...incoming,
    texture: current.texture,
    metamorphicFacies: current.metamorphicFacies,
  };
}

// The post-publish mass-assignment guard: frozen fields always come from
// storage, never from the payload. The admin form disabling its inputs is UX,
// not enforcement.
export function mergePublishedEdit(
  current: Sample,
  incoming: CreateSample,
): CreateSample {
  const material = mergeMaterial(current.material, incoming.material);
  return {
    // The conditional take feeds the lock lists rather than following them, so
    // listing one of its fields would win instead of being silently defeated.
    ...freezeLocked(
      mergeMaterialDependent(current, incoming, material),
      current,
      LOCKED_SAMPLE_FIELDS_TO_FORM_FIELDS,
    ),
    material,
    location: mergeLocation(current, incoming.location, material),
    description: mergeDescription(current.description, incoming.description),
    scientificContext: mergeScientificContext(
      current.scientificContext,
      incoming.scientificContext,
    ),
  };
}
