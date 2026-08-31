import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { ORGANIZATIONS } from "@projet-igsn/domain/institutional-group/organization";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { ListHeader } from "#/filters/list-header.tsx";
import { matchesSearch } from "#/filters/matches-search.ts";
import { searchFilterEntry } from "#/filters/search-filter-entry.tsx";
import { OrganizationTable } from "#/institutional-groups/organization-table.tsx";
import { useInstitutionalGroupManagerCounts } from "#/institutional-groups/use-institutional-group-manager-counts.ts";
import { noManagerFilterEntry } from "#/managers/no-manager-filter-entry.tsx";
import { m } from "#/paraglide/messages.js";
import { useGetInstitutionalGroupCounts } from "#/users/hook/get-institutional-group-counts.ts";

export const Route = createFileRoute("/institutional-groups/organizations/")({
  validateSearch: z.object({
    search: z.string().optional().catch(undefined),
    noManager: z.boolean().optional().catch(undefined),
  }),
  component: () => (
    <SuperAdminOnly>
      <OrganizationsPage />
    </SuperAdminOnly>
  ),
});

function OrganizationsPage() {
  const { search, noManager } = Route.useSearch();
  const navigate = Route.useNavigate();
  const counts = useGetInstitutionalGroupCounts();
  const managerCounts = useInstitutionalGroupManagerCounts();
  const managers = managerCounts.data?.organizations ?? {};

  const matching = search
    ? ORGANIZATIONS.filter((organization) =>
        matchesSearch(organizationLabel(organization.ror), search),
      )
    : [...ORGANIZATIONS];
  const organizations = noManager
    ? matching.filter((organization) => (managers[organization.ror] ?? 0) === 0)
    : matching;

  return (
    <>
      <ListHeader
        title={m.group_organizations_title()}
        filters={[
          searchFilterEntry({
            label: m.filter_organizations_search(),
            placeholder: m.organization_search_placeholder(),
            defaultValue: search,
            className: "col-span-full",
            onSearch: (value) =>
              void navigate({
                search: (prev) => ({ ...prev, search: value || undefined }),
              }),
          }),
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

      <OrganizationTable
        organizations={organizations}
        memberCounts={counts.data?.organizations ?? {}}
        managerCounts={managers}
      />
    </>
  );
}
