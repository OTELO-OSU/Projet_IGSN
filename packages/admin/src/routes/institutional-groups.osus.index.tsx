import { filterOsusByOrg } from "@projet-igsn/domain/institutional-group/filter-osus-by-org";
import { OSUS } from "@projet-igsn/domain/institutional-group/osu";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { OrganizationFilter } from "#/institutional-groups/group-filters.tsx";
import { OsuTable } from "#/institutional-groups/osu-table.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/institutional-groups/osus/")({
  validateSearch: z.object({
    organization: z.string().optional().catch(undefined),
  }),
  component: () => (
    <SuperAdminOnly>
      <OsusPage />
    </SuperAdminOnly>
  ),
});

function OsusPage() {
  const { organization } = Route.useSearch();
  const navigate = Route.useNavigate();

  const osus = organization ? filterOsusByOrg(organization) : [...OSUS];

  return (
    <>
      <h1 className="text-2xl font-bold">{m.group_osus_title()}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <OrganizationFilter
          value={organization}
          onChange={(value) =>
            void navigate({ search: { organization: value } })
          }
        />
      </div>

      <OsuTable osus={osus} />
    </>
  );
}
