import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { ORGANIZATIONS } from "@projet-igsn/domain/institutional-group/organization";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { OrganizationTable } from "#/institutional-groups/organization-table.tsx";
import { m } from "#/paraglide/messages.js";

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

  const organizations = search
    ? ORGANIZATIONS.filter((organization) =>
        organizationLabel(organization.ror)
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : [...ORGANIZATIONS];

  return (
    <>
      <h1 className="text-2xl font-bold">{m.group_organizations_title()}</h1>

      <SearchField
        defaultValue={search}
        label={m.filter_organizations_search()}
        placeholder={m.organization_search_placeholder()}
        onSearch={(value) =>
          void navigate({ search: { search: value || undefined } })
        }
      />

      <OrganizationTable organizations={organizations} />
    </>
  );
}
