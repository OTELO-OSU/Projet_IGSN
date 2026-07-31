import { MATERIAL_TREE } from "../material/classification.ts";
import { resolvePathNode } from "../path/resolve-node.ts";

// The material prefix a published sample must keep: the shallowest ancestor
// whose children are still editable (`editableChildren`, ADR 0022). The full
// path counts as its own prefix, so a sample published on a partial path can
// still be completed. Returns null when nothing in the path unlocks, i.e. the
// whole material is frozen.
export function frozenMaterialPrefix(material: string | null): string | null {
  if (material == null) return null;
  const segments = material.split(".");
  for (let depth = 1; depth <= segments.length; depth++) {
    const prefix = segments.slice(0, depth).join(".");
    if (resolvePathNode(MATERIAL_TREE, prefix)?.node.editableChildren) {
      return prefix;
    }
  }
  return null;
}
