import { isSampleTypeComplete } from "./is-complete.ts";
import { SAMPLE_TYPES, type SampleType } from "./vocabulary.ts";

// The sample-type vocabulary as one bundle for HierarchySelectField: the flat
// paths plus its leaf-only completeness policy.
export const sampleTypeHierarchy = {
  paths: SAMPLE_TYPES,
  canStopAt: isSampleTypeComplete,
} satisfies {
  paths: readonly SampleType[];
  canStopAt: (path: SampleType) => boolean;
};
