import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

import {
  FROZEN_FORM_FIELDS,
  FROZEN_FORM_FIELDS_BY_PROVENANCE,
  frozenHierarchyDepths,
} from "@projet-igsn/domain/sample/publication/published-field-lock";

// A hierarchy field registers one control per level, `name[depth]` (see the form
// kit's HierarchySelectField).
const HIERARCHY_LEVEL = /^(.+)\[(\d+)\]$/;

export function publishedSampleFrozenField(
  provenanceStatus: ProvenanceStatus | null,
  storedMaterial: string | null,
): (name: string) => boolean {
  const frozen = new Set([
    ...FROZEN_FORM_FIELDS,
    ...(provenanceStatus
      ? FROZEN_FORM_FIELDS_BY_PROVENANCE[provenanceStatus]
      : []),
  ]);
  const depths = frozenHierarchyDepths(storedMaterial);
  return (name) => {
    const [, hierarchy, depth] = HIERARCHY_LEVEL.exec(name) ?? [];
    if (hierarchy == null || depth == null) return frozen.has(name);
    return frozen.has(hierarchy) || Number(depth) < (depths[hierarchy] ?? 0);
  };
}
