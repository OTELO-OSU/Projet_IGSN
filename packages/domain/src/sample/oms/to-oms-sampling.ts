import type { CoreProduction } from "../core/core-production-schema.ts";
import type { CoreAgentRole, CoreSample } from "../core/core-sample-schema.ts";
import type { OmsSample } from "./oms-schema.ts";

import { coreAgentName } from "../core/core-agent-name.ts";

type Properties = OmsSample["properties"];

const toSampler = ({
  agent,
}: CoreAgentRole): Properties["isResultOf"]["madeBySampler"] => ({
  "@id": agent.id,
  name: coreAgentName(agent),
});

export function toOmsSampling({
  production,
  responsibility,
}: CoreSample): Properties["isResultOf"] {
  const collector = responsibility.find(({ roles }) =>
    roles.includes("Collector"),
  );
  return {
    startTime: production.collection_date_start,
    endTime: production.collection_date_end,
    timePrecision: production.collectionDatePrecision,
    timeZone: production.collectionDateTimeZone,
    usedProcedure: production.collectionMethod,
    procedureDescription: production.collectionMethodDescription,
    description: production.samplingPurpose,
    hasFeatureOfInterest: production.samplingSite_name,
    madeBySampler: collector == null ? undefined : toSampler(collector),
  };
}

export function toOmsPreparationSteps(
  steps: CoreProduction["processSteps"],
): Properties["preparationStep"] {
  return (steps ?? []).map((step) => ({
    stepType: step.stepType,
    startTime: step.timestampStart,
    endTime: step.timestampEnd,
    timePrecision: step.timestampPrecision,
    timeZone: step.timestampTimeZone,
    description: step.description,
  }));
}
