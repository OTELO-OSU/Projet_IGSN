import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

import {
  FROZEN_FORM_FIELDS,
  FROZEN_FORM_FIELDS_BY_PROVENANCE,
} from "@projet-igsn/domain/sample/publication/published-field-lock";

const HIERARCHY_LEVEL = /\[\d+\]$/;

export function publishedSampleFrozenField(
  provenanceStatus: ProvenanceStatus | null,
): (name: string) => boolean {
  const frozen = new Set([
    ...FROZEN_FORM_FIELDS,
    ...(provenanceStatus
      ? FROZEN_FORM_FIELDS_BY_PROVENANCE[provenanceStatus]
      : []),
  ]);
  return (name) => frozen.has(name.replace(HIERARCHY_LEVEL, ""));
}
