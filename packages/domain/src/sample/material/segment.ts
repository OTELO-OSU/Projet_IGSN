import { pathSegment } from "../path/segment.ts";
import { type MaterialPath, type MaterialSegment } from "./classification.ts";

// The material path's own segment, used to key MATERIAL_TREE.
export function materialSegment(path: MaterialPath): MaterialSegment {
  return pathSegment(path) as MaterialSegment;
}
