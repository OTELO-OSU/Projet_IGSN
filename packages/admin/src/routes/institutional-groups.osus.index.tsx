import { filterOsusByOrg } from "@projet-igsn/domain/institutional-group/filter-osus-by-org";
import { osuLabel } from "@projet-igsn/domain/institutional-group/label";
import { OSUS } from "@projet-igsn/domain/institutional-group/osu";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { ListHeader } from "#/filters/list-header.tsx";
import { matchesSearch } from "#/filters/matches-search.ts";
import { searchFilterEntry } from "#/filters/search-filter-entry.tsx";
import { OrganizationFilter } from "#/institutional-groups/group-filters.tsx";
import { OsuTable } from "#/institutional-groups/osu-table.tsx";
import { useInstitutionalGroupManagerCounts } from "#/institutional-groups/use-institutional-group-manager-counts.ts";
import { noManagerFilterEntry } from "#/managers/no-manager-filter-entry.tsx";
import { m } from "#/paraglide/messages.js";
import { useGetInstitutionalGroupCounts } from "#/users/hook/get-institutional-group-counts.ts";

export const Route = createFileRoute("/institutional-groups/osus/")({
  validateSearch: z.object({
    organization: z.string().optional().catch(undefined),
    search: z.string().optional().catch(undefined),
    noManager: z.boolean().optional().catch(undefined),
  }),
  component: () => (
    <SuperAdminOnly>
      <OsusPage />
    </SuperAdminOnly>
  ),
});

function OsusPage() {
  const { organization, search, noManager } = Route.useSearch();
  const navigate = Route.useNavigate();
  const counts = useGetInstitutionalGroupCounts();
  const managerCounts = useInstitutionalGroupManagerCounts();
  const managers = managerCounts.data?.osus ?? {};

  const inOrganization = organization ? filterOsusByOrg(organization) : OSUS;
  const matching = search
    ? inOrganization.filter((osu) => matchesSearch(osuLabel(osu.code), search))
    : [...inOrganization];
  const osus = noManager
    ? matching.filter((osu) => (managers[osu.code] ?? 0) === 0)
    : matching;

  return (
    <>
      <ListHeader
        title={m.group_osus_title()}
        filters={[
          searchFilterEntry({
            label: m.filter_osus_search(),
            placeholder: m.osu_search_placeholder(),
            defaultValue: search,
            className: "col-span-3",
            onSearch: (value) =>
              void navigate({
                search: (prev) => ({ ...prev, search: value || undefined }),
              }),
          }),
          {
            name: "organization",
            label: m.field_institutional_organization(),
            cell: (
              <OrganizationFilter
                value={organization}
                onChange={(value) =>
                  void navigate({
                    search: (prev) => ({ ...prev, organization: value }),
                  })
                }
              />
            ),
          },
          noManagerFilterEntry({
            checked: noManager === true,
            onChange: (checked) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  noManager: checked || undefined,
                }),
              }),
          }),
        ]}
      />

      <OsuTable
        osus={osus}
        memberCounts={counts.data?.osus ?? {}}
        managerCounts={managers}
      />
    </>
  );
}
