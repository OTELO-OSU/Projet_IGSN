import type { CreateSample, Sample } from "../sample.ts";
import type { ScientificContext } from "../scientific-context/model.ts";
import type { ProvenanceStatus } from "../scientific-context/provenance-status.ts";
import type { SyntheticDetails } from "../synthetic-details/model.ts";

import { isPathAtOrUnder } from "../path/is-at-or-under.ts";
import { frozenMaterialPrefix } from "./frozen-material-prefix.ts";

const LOCKED_SAMPLE_FIELDS_TO_FORM_FIELDS = {
  manualGroupIds: ["manualGroupIds"],
} as const;
const LOCKED_FIELD_SAMPLE_FIELDS_TO_FORM_FIELDS = {
  collectorName: ["scientificContext.collectorName"],
} as const;
const LOCKED_COLLECTION_SPECIMEN_FIELDS_TO_FORM_FIELDS = {
  collectionOrigin: ["scientificContext.collectionOrigin"],
} as const;

const LOCKED_SYNTHETIC_DETAILS_FIELDS_TO_FORM_FIELDS = {
  operatorName: ["syntheticDetails.operatorName"],
} as const;

const PROVENANCE_DISCRIMINANT_FORM_FIELD =
  "scientificContext.provenanceStatus" as const;

export const FROZEN_FORM_FIELDS: readonly string[] = [
  ...Object.values(LOCKED_SAMPLE_FIELDS_TO_FORM_FIELDS).flat(),
  ...Object.values(LOCKED_SYNTHETIC_DETAILS_FIELDS_TO_FORM_FIELDS).flat(),
  PROVENANCE_DISCRIMINANT_FORM_FIELD,
];

export const FROZEN_FORM_FIELDS_BY_PROVENANCE: Record<
  ProvenanceStatus,
  readonly string[]
> = {
  field_sample: Object.values(LOCKED_FIELD_SAMPLE_FIELDS_TO_FORM_FIELDS).flat(),
  collection_specimen: Object.values(
    LOCKED_COLLECTION_SPECIMEN_FIELDS_TO_FORM_FIELDS,
  ).flat(),
};

export function frozenMaterialDepth(material: Sample["material"]): number {
  return frozenMaterialPrefix(material)?.split(".").length ?? Infinity;
}

type FieldSample = Extract<
  ScientificContext,
  { provenanceStatus: "field_sample" }
>;
type CollectionSpecimen = Extract<
  ScientificContext,
  { provenanceStatus: "collection_specimen" }
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

function mergeMaterial(
  current: Sample["material"],
  incoming: CreateSample["material"],
): Sample["material"] {
  const frozen = frozenMaterialPrefix(current);
  if (frozen == null || incoming == null) return current;
  return isPathAtOrUnder(incoming, frozen) ? incoming : current;
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
  if (current.provenanceStatus === "field_sample") {
    if (incoming?.provenanceStatus !== "field_sample") return current;
    const payload: FieldSample = { ...incoming };
    return freezeLocked(
      payload,
      current,
      LOCKED_FIELD_SAMPLE_FIELDS_TO_FORM_FIELDS,
    );
  }
  if (incoming?.provenanceStatus !== "collection_specimen") return current;
  const payload: CollectionSpecimen = { ...incoming };
  return freezeLocked(
    payload,
    current,
    LOCKED_COLLECTION_SPECIMEN_FIELDS_TO_FORM_FIELDS,
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
    materialOtherName: current.materialOtherName,
    texture: current.texture,
    metamorphicFacies: current.metamorphicFacies,
    metamorphicFabric: current.metamorphicFabric,
    location: current.location ?? null,
    geologicalContextDescription: current.geologicalContextDescription,
    geomorphologicalEnvironment: current.geomorphologicalEnvironment,
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
