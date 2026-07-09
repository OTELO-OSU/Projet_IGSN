import { z } from "zod";

import type { Sample } from "./sample.ts";

import { isMaterialLeaf } from "./is-material-leaf.ts";
import { isMaterialPublishable } from "./is-material-publishable.ts";
import { isSampleTypeLeaf } from "./is-sample-type-leaf.ts";
import { sampleSchema } from "./sample.ts";

// The reasons a sample cannot be published yet, as codes (i18n rule: callers
// map each to a label). Add a code here when adding a publish constraint; every
// caller that lists reasons (e.g. the admin publish tooltip) maps this enum
// exhaustively, so a new code fails to compile until it is handled.
export const publishBlockerSchema = z.enum([
  "type_missing",
  "type_incomplete",
  "material_missing",
  "material_not_publishable",
  "material_incomplete",
  "specific_name_missing",
]);

export type PublishBlocker = z.infer<typeof publishBlockerSchema>;

// Single source of truth for publishability: a sample parses cleanly iff it can
// be published. isSamplePublishable reads .success; samplePublishBlockers reads
// the reason code each issue carries in params.blocker. Type and material are
// independent dimensions, so both are reported; within each, only the first
// (most fundamental) blocker is: a value must be set before it is worth asking
// to classify it deeper.
//
// Publishability depends only on type, material and specificName, so we refine
// the picked trio, not the whole sample: this lets the admin form check an in-progress
// sample (which has no id/igsn/timestamps yet) without the base parse failing
// before the refinement runs.
export const publishableSampleSchema = sampleSchema
  .pick({ type: true, material: true, specificName: true })
  .superRefine((sample, ctx) => {
    const typeBlocker = ((): PublishBlocker | null => {
      if (sample.type === null) return "type_missing";
      if (!isSampleTypeLeaf(sample.type)) return "type_incomplete";
      return null;
    })();
    const materialBlocker = ((): PublishBlocker | null => {
      if (sample.material === null) return "material_missing";
      if (!isMaterialPublishable(sample.material))
        return "material_not_publishable";
      if (!isMaterialLeaf(sample.material)) return "material_incomplete";
      return null;
    })();
    const specificNameBlocker: PublishBlocker | null =
      sample.specificName === null ? "specific_name_missing" : null;
    for (const blocker of [typeBlocker, materialBlocker, specificNameBlocker]) {
      if (blocker) {
        ctx.addIssue({ code: "custom", params: { blocker }, message: blocker });
      }
    }
  });

export function samplePublishBlockers(
  sample: Pick<Sample, "type" | "material" | "specificName">,
): PublishBlocker[] {
  const result = publishableSampleSchema.safeParse(sample);
  if (result.success) return [];
  return result.error.issues.flatMap((issue) =>
    issue.code === "custom" && issue.params
      ? [issue.params.blocker as PublishBlocker]
      : [],
  );
}
