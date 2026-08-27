import type { InstitutionKind } from "@projet-igsn/domain/institutional-group/institution-filter";

import { Label } from "@projet-igsn/design-system/components/ui/label";
import { parseInstitutionFilter } from "@projet-igsn/domain/institutional-group/institution-filter";
import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";

import type { FilterEntry } from "#/filters/list-header.tsx";

import { TreeFilter } from "#/filters/tree-filter.tsx";
import {
  INSTITUTION_TREE,
  ORGANIZATION_TREE,
} from "#/institutional-groups/institution-tree-nodes.ts";
import { m } from "#/paraglide/messages.js";

const LABEL_BY_KIND: Record<InstitutionKind, (code: string) => string> = {
  organization: organizationLabel,
  osu: osuLabel,
  laboratory: laboratoryLabel,
};

const ID = "institution-filter";

export function InstitutionTreeFilter({
  value,
  onChange,
  withLaboratories = true,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  withLaboratories?: boolean;
}) {
  const parsed = value === undefined ? null : parseInstitutionFilter(value);

  return (
    <>
      <Label htmlFor={ID}>{m.filter_institution_label()}</Label>
      <TreeFilter
        id={ID}
        nodes={withLaboratories ? INSTITUTION_TREE : ORGANIZATION_TREE}
        value={value}
        onChange={onChange}
        selectedLabel={
          parsed ? LABEL_BY_KIND[parsed.kind](parsed.code) : undefined
        }
        anyLabel={m.filter_institution_any()}
        searchLabel={m.filter_institution_search_label()}
        emptyText={m.filter_institution_empty()}
      />
    </>
  );
}

export function institutionFilterEntry({
  value,
  onChange,
  onRemove,
  withLaboratories,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onRemove?: () => void;
  withLaboratories?: boolean;
}): FilterEntry {
  return {
    name: "institution",
    label: m.filter_institution_label(),
    active: value !== undefined,
    onRemove,
    cell: (
      <InstitutionTreeFilter
        value={value}
        onChange={onChange}
        withLaboratories={withLaboratories}
      />
    ),
  };
}
