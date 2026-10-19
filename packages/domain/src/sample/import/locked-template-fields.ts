import type { ProvenanceStatus } from "../scientific-context/provenance-status.ts";
import type { TemplateFieldKey } from "./template-fields.ts";

const PROVENANCE_REQUIRED_TEMPLATE_FIELDS: Record<
  ProvenanceStatus,
  readonly TemplateFieldKey[]
> = {
  research_project_sample: ["collectionDate", "position", "collector"],
  collection_specimen: ["collectionOrigin"],
};

export const lockedTemplateFields = ({
  provenanceStatus,
  hasManualGroup,
}: {
  provenanceStatus?: ProvenanceStatus;
  hasManualGroup: boolean;
}): readonly TemplateFieldKey[] => [
  ...(provenanceStatus === undefined
    ? Object.values(PROVENANCE_REQUIRED_TEMPLATE_FIELDS).flat()
    : PROVENANCE_REQUIRED_TEMPLATE_FIELDS[provenanceStatus]),
  ...(hasManualGroup ? (["manualGroup"] as const) : []),
];
