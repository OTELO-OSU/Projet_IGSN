import { type MaterialPath } from "./material.ts";
import { publishableMaterialTypeSchema } from "./publishable-material.ts";

// A path is publishable only if its root type is on the allowlist. Leaf-ness is
// a separate check (see isMaterialLeaf); both must hold to publish.
export function isMaterialPublishable(path: MaterialPath): boolean {
  return publishableMaterialTypeSchema.safeParse(path.split(".")[0]).success;
}
