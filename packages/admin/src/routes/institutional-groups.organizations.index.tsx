import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { ORGANIZATIONS } from "@projet-igsn/domain/institutional-group/organization";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { ListHeader } from "#/filters/list-header.tsx";
import { matchesSearch } from "#/filters/matches-search.ts";
import { searchFilterEntry } from "#/filters/search-filter-entry.tsx";
import { OrganizationTable } from "#/institutional-groups/organization-table.tsx";
import { m } from "#/paraglide/messages.js";
import { useGetInstitutionalGroupCounts } from "#/users/hook/get-institutional-group-counts.ts";

export const Route = createFileRoute("/institutional-groups/organizations/")({
  validateSearch: z.object({
    search: z.string().optional().catch(undefined),
  }),
  component: () => (
    <SuperAdminOnly>
      <OrganizationsPage />
    </SuperAdminOnly>
  ),
});

function OrganizationsPage() {
  const { search } = Route.useSearch();
  const navigate = Route.useNavigate();
  const counts = useGetInstitutionalGroupCounts();

  const organizations = search
    ? ORGANIZATIONS.filter((organization) =>
        matchesSearch(organizationLabel(organization.ror), search),
      )
    : [...ORGANIZATIONS];

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
              void navigate({ search: { search: value || undefined } }),
          }),
        ]}
      />

      <OrganizationTable
        organizations={organizations}
        memberCounts={counts.data?.organizations ?? {}}
      />
    </>
  );
}
