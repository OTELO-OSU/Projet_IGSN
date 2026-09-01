import type { Description } from "../description/model.ts";
import type { Location } from "../location/model.ts";
import type { CreateSample, Sample } from "../sample.ts";
import type { ScientificContext } from "../scientific-context/model.ts";
import type { ProvenanceStatus } from "../scientific-context/provenance-status.ts";
import type { SyntheticDetails } from "../synthetic-details/model.ts";

import { allowsLocation } from "../location/allows-location.ts";
import { isPathAtOrUnder } from "../path/is-at-or-under.ts";
import { frozenMaterialPrefix } from "./frozen-material-prefix.ts";

const LOCKED_SAMPLE_FIELDS_TO_FORM_FIELDS = {
  name: ["name"],
  nature: ["nature"],
  type: ["typePath"],
  geologicalContextDescription: ["geologicalContextDescription"],
  geomorphologicalEnvironment: ["geomorphologicalEnvironmentPath"],
  manualGroupIds: ["manualGroupIds"],
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
    "location.startLongitude",
    "location.startLatitude",
    "location.endLongitude",
    "location.endLatitude",
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
  funderOrganizations: ["scientificContext.funderOrganizations"],
  researchProgramName: ["scientificContext.researchProgramName"],
  chiefScientist: ["scientificContext.chiefScientist"],
  chiefScientistOrcid: ["scientificContext.chiefScientistOrcid"],
  collectorName: ["scientificContext.collectorName"],
} as const;
const LOCKED_HISTORICAL_SPECIMEN_FIELDS_TO_FORM_FIELDS = {
  collectionCurator: ["scientificContext.collectionCurator"],
  collectionOrigin: ["scientificContext.collectionOrigin"],
} as const;

const LOCKED_SYNTHETIC_DETAILS_FIELDS_TO_FORM_FIELDS = {
  startingMaterialNature: ["syntheticDetails.startingMaterialNature"],
  startingMaterialForm: ["syntheticDetails.startingMaterialForm"],
  startingMaterialComposition: ["syntheticDetails.startingMaterialComposition"],
  finalProduct: ["syntheticDetails.finalProduct"],
  experimentType: ["syntheticDetails.experimentType"],
  experimentDuration: [
    "syntheticDetails.experimentDurationValue",
    "syntheticDetails.experimentDurationUnit",
  ],
  experimentDurationNotRelevant: [
    "syntheticDetails.experimentDurationNotRelevant",
  ],
  synthesisDate: [
    "syntheticDetails.synthesisDateStart",
    "syntheticDetails.synthesisDateEnd",
  ],
  operatorName: ["syntheticDetails.operatorName"],
  operatorOrcid: ["syntheticDetails.operatorOrcid"],
  researchStructure: ["syntheticDetails.researchStructure"],
} as const;

const PROVENANCE_DISCRIMINANT_FORM_FIELD =
  "scientificContext.provenanceStatus" as const;

export const FROZEN_FORM_FIELDS: readonly string[] = [
  ...Object.values(LOCKED_SAMPLE_FIELDS_TO_FORM_FIELDS).flat(),
  ...Object.values(LOCKED_LOCATION_FIELDS_TO_FORM_FIELDS).flat(),
  ...Object.values(LOCKED_DESCRIPTION_FIELDS_TO_FORM_FIELDS).flat(),
  ...Object.values(LOCKED_SYNTHETIC_DETAILS_FIELDS_TO_FORM_FIELDS).flat(),
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

export function frozenMaterialDepth(material: Sample["material"]): number {
  return frozenMaterialPrefix(material)?.split(".").length ?? Infinity;
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

type Position = NonNullable<Location["position"]>;

function mergeVertical(
  current: Position,
  incoming: Location["position"],
): Position {
  return {
    ...current,
    vertical:
      incoming?.type === current.type ? (incoming.vertical ?? null) : null,
  };
}

function mergeLocation(
  current: Sample,
  incoming: CreateSample["location"],
  material: Sample["material"],
): Location | null {
  // A material that forbids a location cannot erase one a published sample already stored.
  if (!allowsLocation(material)) return current.location ?? null;
  const payload: Location = { ...incoming };
  const merged = freezeLocked(
    payload,
    {
      position: current.location?.position ?? null,
      region: current.location?.region ?? null,
    },
    LOCKED_LOCATION_FIELDS_TO_FORM_FIELDS,
  );
  const position = merged.position
    ? mergeVertical(merged.position, payload.position)
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

function mergeSyntheticDetails(
  current: Sample["syntheticDetails"],
  incoming: CreateSample["syntheticDetails"],
): SyntheticDetails | null {
  if (current == null) return incoming ?? null;
  const payload: SyntheticDetails = { ...incoming };
  return freezeLocked(
    payload,
    current,
    LOCKED_SYNTHETIC_DETAILS_FIELDS_TO_FORM_FIELDS,
  );
}

function mergeScientificContext(
  current: Sample["scientificContext"],
  incoming: CreateSample["scientificContext"],
): ScientificContext | null {
  if (current == null) {
    return null;
  }
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

export function mergePublishedEdit(
  current: Sample,
  incoming: CreateSample,
): CreateSample {
  const material = mergeMaterial(current.material, incoming.material);
  const merged: CreateSample = {
    ...mergeMaterialDependent(current, incoming, material),
    material,
    location: mergeLocation(current, incoming.location, material),
    description: mergeDescription(current.description, incoming.description),
    scientificContext: mergeScientificContext(
      current.scientificContext,
      incoming.scientificContext,
    ),
    syntheticDetails: mergeSyntheticDetails(
      current.syntheticDetails,
      incoming.syntheticDetails,
    ),
  };
  return freezeLocked(
    merged,
    {
      ...current,
      manualGroupIds: current.manualGroups.map((group) => group.id),
    },
    LOCKED_SAMPLE_FIELDS_TO_FORM_FIELDS,
  );
}
