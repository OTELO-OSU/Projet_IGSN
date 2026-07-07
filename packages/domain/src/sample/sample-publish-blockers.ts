import { z } from "zod";

import type { Sample } from "./sample.ts";

import { isMaterialLeaf } from "./is-material-leaf.ts";
import { isMaterialPublishable } from "./is-material-publishable.ts";

// The reasons a sample cannot be published yet, as codes (i18n rule: callers
// map each to a label). Add a code here when adding a publish constraint; every
// caller that lists reasons (e.g. the admin publish tooltip) maps this enum
// exhaustively, so a new code fails to compile until it is handled.
export const publishBlockerSchema = z.enum([
  "material_missing",
  "material_not_publishable",
  "material_incomplete",
]);

export type PublishBlocker = z.infer<typeof publishBlockerSchema>;

export function samplePublishBlockers(sample: Sample): PublishBlocker[] {
  if (sample.material === null) {
    return ["material_missing"];
  }
  // Type must be in scope before it is worth asking to classify deeper.
  if (!isMaterialPublishable(sample.material)) {
    return ["material_not_publishable"];
  }
  if (!isMaterialLeaf(sample.material)) {
    return ["material_incomplete"];
  }
  return [];
}
