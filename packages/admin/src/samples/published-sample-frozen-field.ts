import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

import { frozenMaterialPrefix } from "@projet-igsn/domain/sample/publication/frozen-material-prefix";
import {
  FROZEN_FORM_FIELDS,
  FROZEN_FORM_FIELDS_BY_PROVENANCE,
} from "@projet-igsn/domain/sample/publication/published-field-lock";

const HIERARCHY_LEVEL = /\[\d+\]$/;
const MATERIAL_LEVEL = /^materialPath\[(\d+)\]$/;

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
  const frozenMaterialDepth =
    frozenMaterialPrefix(storedMaterial)?.split(".").length ?? Infinity;
  return (name) => {
    const level = MATERIAL_LEVEL.exec(name);
    if (level) return Number(level[1]) < frozenMaterialDepth;
    return frozen.has(name.replace(HIERARCHY_LEVEL, ""));
  };
}
