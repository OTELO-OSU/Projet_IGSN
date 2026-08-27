import { buildInstitutionTree } from "@projet-igsn/domain/institutional-group/build-institution-tree";
import { formatInstitutionFilter } from "@projet-igsn/domain/institutional-group/institution-filter";
import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";

import type { TreeFilterNode } from "#/filters/tree-filter-node.ts";

import { m } from "#/paraglide/messages.js";

export const INSTITUTION_TREE: TreeFilterNode[] = buildInstitutionTree().map(
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

export const ORGANIZATION_TREE: TreeFilterNode[] = INSTITUTION_TREE.map(
  (organization) => ({
    ...organization,
    children: organization.children
      .filter((osu) => osu.value !== undefined)
      .map((osu) => ({ ...osu, children: [] })),
  }),
);
