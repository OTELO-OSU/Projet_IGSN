import type { SampleProcessStep } from "../process-step/model.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import {
  CORE_SYNTHESIS_STEP,
  coreProcessStepKind,
} from "./core-production-schema.ts";
import { fromCoreStepDate } from "./from-core-date-range.ts";

export function fromCoreProcessSteps(
  body: CoreSampleBody,
): SampleProcessStep[] {
  return (body.production.processSteps ?? [])
    .filter((step) => step.stepType !== CORE_SYNTHESIS_STEP)
    .map((step) => ({
      kind: coreProcessStepKind.fromCore(step.stepType),
      date: fromCoreStepDate(step),
      description: step.description ?? null,
    }));
}
