import { MATERIAL_TREE } from "../material/classification.ts";
import { resolvePathNode } from "../path/resolve-node.ts";

const isEditable = (path: string) =>
  resolvePathNode(MATERIAL_TREE, path)?.node.frozenWhenPublished === false;

export function frozenMaterialPrefix(material: string | null): string | null {
  if (material == null) return null;
  const segments = material.split(".");
  const firstEditable = segments.findIndex((_, depth) =>
    isEditable(segments.slice(0, depth + 1).join(".")),
  );
  if (firstEditable === 0) return null;
  if (firstEditable > 0) return segments.slice(0, firstEditable).join(".");
  const choices = resolvePathNode(MATERIAL_TREE, material)?.node.choices ?? [];
  return choices.length > 0 &&
    choices.every((code) => isEditable(`${material}.${code}`))
    ? material
    : null;
}
