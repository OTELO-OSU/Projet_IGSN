import { type MaterialPath } from "@projet-igsn/domain/sample/material";
import { materialChildren } from "@projet-igsn/domain/sample/material-children";

// The rows the cascade renders for a given selected path: one selector per
// already-chosen level, plus a trailing empty selector while the deepest choice
// still has children (i.e. is not a leaf). Pure, so it is unit-tested directly.
export function materialCascadeLevels(
  value: string,
): { parent: MaterialPath | null; value: string }[] {
  const segments = value ? value.split(".") : [];
  const levels = segments.map((_, i) => ({
    parent: (i === 0
      ? null
      : segments.slice(0, i).join(".")) as MaterialPath | null,
    value: segments.slice(0, i + 1).join("."),
  }));
  const deepest = (value || null) as MaterialPath | null;
  if (materialChildren(deepest).length > 0) {
    levels.push({ parent: deepest, value: "" });
  }
  return levels;
}
