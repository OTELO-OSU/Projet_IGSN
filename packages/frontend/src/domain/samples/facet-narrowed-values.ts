import { filterLaboratoriesByOrgAndOsu } from "@projet-igsn/domain/institutional-group/filter-laboratories-by-org-and-osu";
import { filterOsusByOrg } from "@projet-igsn/domain/institutional-group/filter-osus-by-org";

import type { FacetValues } from "#/domain/samples/facet-values.ts";

const organizationOf = (values: FacetValues) =>
  values.institutionalOrganization as string | undefined;

export const NARROWED_VALUES: Record<
  string,
  (values: FacetValues) => readonly string[]
> = {
  institutionalOsu: (values) => {
    const organizationRor = organizationOf(values);
    return organizationRor
      ? filterOsusByOrg(organizationRor).map((osu) => osu.code)
      : [];
  },
  institutionalLaboratory: (values) => {
    const organizationRor = organizationOf(values);
    return organizationRor
      ? filterLaboratoriesByOrgAndOsu({
          organizationRor,
          osu: values.institutionalOsu as string | undefined,
        }).map((laboratory) => laboratory.code)
      : [];
  },
};
