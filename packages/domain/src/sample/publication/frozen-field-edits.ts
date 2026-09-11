import type { CreateSample, Sample } from "../sample.ts";

import { changedPaths } from "../changed-paths.ts";
import { mergePublishedEdit } from "./published-field-lock.ts";

export function frozenFieldEdits(
  current: Sample,
  incoming: CreateSample,
): string[] {
  return changedPaths(incoming, mergePublishedEdit(current, incoming));
}
