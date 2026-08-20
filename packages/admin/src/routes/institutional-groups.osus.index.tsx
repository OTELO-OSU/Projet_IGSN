import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { filterOsusByOrg } from "@projet-igsn/domain/institutional-group/filter-osus-by-org";
import { osuLabel } from "@projet-igsn/domain/institutional-group/label";
import { OSUS } from "@projet-igsn/domain/institutional-group/osu";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { OrganizationFilter } from "#/institutional-groups/group-filters.tsx";
import { matchesSearch } from "#/institutional-groups/matches-search.ts";
import { OsuTable } from "#/institutional-groups/osu-table.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/institutional-groups/osus/")({
  validateSearch: z.object({
    organization: z.string().optional().catch(undefined),
    search: z.string().optional().catch(undefined),
  }),
  component: () => (
    <SuperAdminOnly>
      <OsusPage />
    </SuperAdminOnly>
  ),
});

function OsusPage() {
  const { organization, search } = Route.useSearch();
  const navigate = Route.useNavigate();

  const inOrganization = organization ? filterOsusByOrg(organization) : OSUS;
  const osus = search
    ? inOrganization.filter((osu) => matchesSearch(osuLabel(osu.code), search))
    : [...inOrganization];

  return (
    <>
      <h1 className="text-2xl font-bold">{m.group_osus_title()}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <SearchField
          defaultValue={search}
          label={m.filter_osus_search()}
          placeholder={m.osu_search_placeholder()}
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
              search: (prev) => ({ ...prev, organization: value }),
            })
          }
        />
      </div>

      <OsuTable osus={osus} />
    </>
  );
}
