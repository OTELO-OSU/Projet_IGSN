import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { filterLaboratoriesByOrgAndOsu } from "@projet-igsn/domain/institutional-group/filter-laboratories-by-org-and-osu";
import { laboratoryLabel } from "@projet-igsn/domain/institutional-group/label";
import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import {
  OrganizationFilter,
  OsuFilter,
} from "#/institutional-groups/group-filters.tsx";
import { LaboratoryTable } from "#/institutional-groups/laboratory-table.tsx";
import { matchesSearch } from "#/institutional-groups/matches-search.ts";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/institutional-groups/laboratories/")({
  validateSearch: z.object({
    organization: z.string().optional().catch(undefined),
    osu: z.string().optional().catch(undefined),
    search: z.string().optional().catch(undefined),
  }),
  component: () => (
    <SuperAdminOnly>
      <LaboratoriesPage />
    </SuperAdminOnly>
  ),
});

function LaboratoriesPage() {
  const { organization, osu, search } = Route.useSearch();
  const navigate = Route.useNavigate();

  const inGroup = organization
    ? filterLaboratoriesByOrgAndOsu({ organizationRor: organization, osu })
    : LABORATORIES;
  const laboratories = search
    ? inGroup.filter((laboratory) =>
        matchesSearch(laboratoryLabel(laboratory.code), search),
      )
    : [...inGroup];

  return (
    <>
      <h1 className="text-2xl font-bold">{m.group_laboratories_title()}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <SearchField
          defaultValue={search}
          label={m.filter_laboratories_search()}
          placeholder={m.laboratory_search_placeholder()}
          onSearch={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, search: value || undefined }),
            })
          }
        />
        <OrganizationFilter
          value={organization}
          onChange={(value) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                organization: value,
                osu: undefined,
              }),
            })
          }
        />
        <OsuFilter
          organization={organization}
          value={osu}
          onChange={(value) =>
            void navigate({ search: (prev) => ({ ...prev, osu: value }) })
          }
        />
      </div>

      <LaboratoryTable laboratories={laboratories} />
    </>
  );
}
