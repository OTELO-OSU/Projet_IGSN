import { buildInstitutionTree } from "@projet-igsn/domain/institutional-group/build-institution-tree";
import { formatInstitutionFilter } from "@projet-igsn/domain/institutional-group/institution-filter";
import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";

import { matchesSearch } from "#/institutional-groups/matches-search.ts";
import { m } from "#/paraglide/messages.js";

export type InstitutionNode = {
  key: string;
  label: string;
  value?: string;
  children: InstitutionNode[];
};

export const INSTITUTION_TREE: InstitutionNode[] = buildInstitutionTree().map(
  ({ ror, osus }) => ({
    key: ror,
    label: organizationLabel(ror),
    value: formatInstitutionFilter({ kind: "organization", code: ror }),
    children: osus.map(({ code, laboratories }) => ({
      key: `${ror}/${code ?? "standalone"}`,
      label: code === null ? m.filter_institution_standalone() : osuLabel(code),
      value:
        code === null
          ? undefined
          : formatInstitutionFilter({
              kind: "osu",
              code,
              organizationRor: ror,
            }),
      children: laboratories.map((laboratory) => ({
        key: laboratory,
        label: laboratoryLabel(laboratory),
        value: formatInstitutionFilter({
          kind: "laboratory",
          code: laboratory,
        }),
        children: [],
      })),
    })),
  }),
);

export function filterNodes(
  nodes: InstitutionNode[],
  search: string,
): InstitutionNode[] {
  return nodes.flatMap((node) => {
    if (matchesSearch(node.label, search)) return [node];
    const children = filterNodes(node.children, search);
    return children.length === 0 ? [] : [{ ...node, children }];
  });
}
