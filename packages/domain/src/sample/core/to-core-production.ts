import type { DateRange } from "../date-range.ts";
import type { Sample } from "../sample.ts";
import type {
  CoreProcessStep,
  CoreProduction,
} from "./core-production-schema.ts";

import { collectionDateSchema } from "../description/collection-date.ts";
import { isEmpty, optionalConcept } from "./core-optional.ts";
import {
  CORE_SYNTHESIS_STEP,
  coreProcessStepKind,
  toRorUri,
} from "./core-production-schema.ts";
import { toCoreLocation } from "./to-core-location.ts";

function toCoreProjects(sample: Sample): CoreProduction["projects"] {
  const context = sample.scientificContext;
  if (context?.provenanceStatus !== "field_sample") return undefined;
  const project = {
    name: context.researchProgramName ?? undefined,
    fundingReferences: context.funderOrganizations?.map((ror) => ({
      value: toRorUri(ror),
      identifierType: "ROR" as const,
    })),
    funding: context.funding ?? undefined,
    description: context.researchProgramDescription ?? undefined,
    campaign: context.researchCampaign ?? undefined,
  };
  return isEmpty(project) ? undefined : [project];
}

function toCoreTimestamps(date: DateRange | null | undefined) {
  return {
    timestampStart: date?.start,
    timestampEnd: date?.end,
    timestampPrecision: date?.precision,
    timestampTimeZone: date?.precision === "hour" ? date.timeZone : undefined,
  };
}

function toCoreSynthesisStep(sample: Sample): CoreProcessStep | undefined {
  const details = sample.syntheticDetails;
  if (details == null) return undefined;
  const step = {
    stepType: CORE_SYNTHESIS_STEP,
    description: details.experimentalProtocol ?? undefined,
    ...toCoreTimestamps(details.synthesisDate),
    method: optionalConcept("experiment-type", details.experimentType),
  };
  return step.description == null &&
    step.timestampStart == null &&
    step.method == null
    ? undefined
    : step;
}

function toCoreProcessSteps(sample: Sample): CoreProduction["processSteps"] {
  const synthesis = toCoreSynthesisStep(sample);
  const steps = [
    ...(synthesis == null ? [] : [synthesis]),
    ...sample.processSteps.map((step) => ({
      stepType: coreProcessStepKind.toCore(step.kind),
      description: step.description ?? undefined,
      ...toCoreTimestamps(step.date),
    })),
  ];
  return steps.length === 0 ? undefined : steps;
}

export function toCoreProduction(sample: Sample): CoreProduction {
  const collectionDate = collectionDateSchema.parse(
    sample.description?.collectionDate,
  );
  const context = sample.scientificContext;
  const fieldSample =
    context?.provenanceStatus === "field_sample" ? context : null;
  return {
    collection_date_start: collectionDate.start,
    collection_date_end: collectionDate.end,
    collectionDatePrecision: collectionDate.precision,
    collectionDateTimeZone:
      collectionDate.precision === "hour" ? collectionDate.timeZone : undefined,
    collectionMethod: optionalConcept(
      "sample_description",
      sample.collectionMethod,
    ),
    collectionMethodDescription:
      sample.collectionMethodDescription ?? undefined,
    samplingPurpose: fieldSample?.missionDescription ?? undefined,
    samplingSite_name: fieldSample?.fieldName ?? undefined,
    projects: toCoreProjects(sample),
    processSteps: toCoreProcessSteps(sample),
    location:
      sample.location == null ? undefined : toCoreLocation(sample.location),
  };
}
