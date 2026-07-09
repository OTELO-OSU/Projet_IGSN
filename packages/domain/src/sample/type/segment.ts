import { pathSegment } from "../path/segment.ts";
import { type SampleType, type SampleTypeSegment } from "./vocabulary.ts";

// The sample-type path's own segment, used to key SAMPLE_TYPE_TREE and labels.
export function sampleTypeSegment(path: SampleType): SampleTypeSegment {
  return pathSegment(path) as SampleTypeSegment;
}
