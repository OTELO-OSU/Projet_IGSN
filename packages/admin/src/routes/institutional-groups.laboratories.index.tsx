import { institutionFilterSchema } from "@projet-igsn/domain/institutional-group/institution-filter";
import { institutionLaboratories } from "@projet-igsn/domain/institutional-group/institution-laboratory-codes";
import { laboratoryLabel } from "@projet-igsn/domain/institutional-group/label";
import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { ListHeader } from "#/filters/list-header.tsx";
import { matchesSearch } from "#/filters/matches-search.ts";
import { searchFilterEntry } from "#/filters/search-filter-entry.tsx";
import { institutionFilterEntry } from "#/institutional-groups/institution-tree-filter.tsx";
import { LaboratoryTable } from "#/institutional-groups/laboratory-table.tsx";
import { m } from "#/paraglide/messages.js";
import { useGetInstitutionalGroupCounts } from "#/users/hook/get-institutional-group-counts.ts";

export const Route = createFileRoute("/institutional-groups/laboratories/")({
  validateSearch: z.object({
    institution: institutionFilterSchema.optional().catch(undefined),
    search: z.string().optional().catch(undefined),
  }),
  component: () => (
    <SuperAdminOnly>
      <LaboratoriesPage />
    </SuperAdminOnly>
  ),
});

function LaboratoriesPage() {
  const { institution, search } = Route.useSearch();
  const navigate = Route.useNavigate();
  const counts = useGetInstitutionalGroupCounts();

  const inGroup = institution
    ? institutionLaboratories(institution)
    : LABORATORIES;
  const laboratories = search
    ? inGroup.filter((laboratory) =>
        matchesSearch(laboratoryLabel(laboratory.code), search),
      )
    : [...inGroup];

  return (
    <>
      <ListHeader
        title={m.group_laboratories_title()}
        filters={[
          searchFilterEntry({
            label: m.filter_laboratories_search(),
            placeholder: m.laboratory_search_placeholder(),
            defaultValue: search,
            className: "col-span-3",
            onSearch: (value) =>
              void navigate({
                search: (prev) => ({ ...prev, search: value || undefined }),
              }),
          }),
          institutionFilterEntry({
            withLaboratories: false,
            value: institution,
            onChange: (next) =>
              void navigate({
                search: (prev) => ({ ...prev, institution: next }),
              }),
          }),
        ]}
      />

      <LaboratoryTable
        laboratories={laboratories}
        memberCounts={counts.data?.laboratories ?? {}}
      />
    </>
  );
}
