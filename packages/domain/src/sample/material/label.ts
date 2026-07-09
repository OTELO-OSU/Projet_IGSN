import { pathLabelKey } from "../path/label-key.ts";
import { type MaterialPath } from "./classification.ts";

// The i18n message key for a material node (see pathLabelKey), e.g.
// `material_rock`.
export function materialLabelKey(path: MaterialPath): string {
  return pathLabelKey("material", path);
}
