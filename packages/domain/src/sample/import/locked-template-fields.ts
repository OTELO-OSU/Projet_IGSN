import type { TemplateFieldKey } from "./template-fields.ts";

import {
  PROVENANCE_STATUSES,
  type ProvenanceStatus,
} from "../scientific-context/provenance-status.ts";

const PROVENANCE_REQUIRED_TEMPLATE_FIELDS: Record<
  ProvenanceStatus,
  readonly TemplateFieldKey[]
> = {
  research_project_sample: ["collectionDate", "position", "collector"],
  collection_specimen: ["collectionOrigin"],
};

export type TemplateFieldLock = ProvenanceStatus | "manualGroup";

export type TemplateFieldLocks = Partial<
  Record<TemplateFieldKey, TemplateFieldLock>
>;

export const lockedTemplateFields = ({
  provenanceStatus,
  hasManualGroup,
}: {
  provenanceStatus?: ProvenanceStatus;
  hasManualGroup: boolean;
}): TemplateFieldLocks =>
  Object.fromEntries([
    ...PROVENANCE_STATUSES.filter(
      (status) => provenanceStatus === undefined || status === provenanceStatus,
    ).flatMap((status) =>
      PROVENANCE_REQUIRED_TEMPLATE_FIELDS[status].map((key) => [key, status]),
    ),
    ...(hasManualGroup ? [["manualGroup", "manualGroup"]] : []),
  ]);
