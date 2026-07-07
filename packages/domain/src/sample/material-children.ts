import { MATERIAL_PATHS, type MaterialPath } from "./material.ts";

// Direct children of a path (one segment deeper), or the root paths when parent
// is null. Order follows MATERIAL_PATHS, so callers get a stable UI order.
export function materialChildren(parent: MaterialPath | null): MaterialPath[] {
  const depth = parent === null ? 1 : parent.split(".").length + 1;
  const prefix = parent === null ? "" : `${parent}.`;
  return MATERIAL_PATHS.filter(
    (path) => path.startsWith(prefix) && path.split(".").length === depth,
  );
}
