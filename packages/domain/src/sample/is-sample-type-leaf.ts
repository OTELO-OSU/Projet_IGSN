import { SAMPLE_TYPES, type SampleType } from "./type.ts";

// A leaf type has no deeper classification. Only a leaf type is publishable: an
// ancestor path ("core") is a valid draft but not specific enough to publish.
// Mirrors is-material-leaf.
export function isSampleTypeLeaf(type: SampleType): boolean {
  return !SAMPLE_TYPES.some((path) => path.startsWith(`${type}.`));
}
