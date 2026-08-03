import { MATERIAL_PATHS, MATERIAL_TREE } from "../material/classification.ts";
import { pathChildren } from "../path/children.ts";
import { resolvePathNode } from "../path/resolve-node.ts";

const isFrozen = (path: string) =>
  resolvePathNode(MATERIAL_TREE, path)?.node.frozenWhenPublished === true;

// The material prefix a published sample must keep: its head of levels marked
// `frozenWhenPublished` (ADR 0022). A wholly frozen path is its own prefix when
// it can still be refined, so a sample published on a partial path can be
// completed. Returns null when nothing may change, including the guarded-away
// case of an editable root, where freezing the whole path is the safe read.
export function frozenMaterialPrefix(material: string | null): string | null {
  if (material == null) return null;
  const segments = material.split(".");
  const firstEditable = segments.findIndex(
    (_, depth) => !isFrozen(segments.slice(0, depth + 1).join(".")),
  );
  if (firstEditable === 0) return null;
  if (firstEditable > 0) return segments.slice(0, firstEditable).join(".");
  const children = pathChildren(MATERIAL_PATHS, material);
  return children.length > 0 && !children.some(isFrozen) ? material : null;
}
