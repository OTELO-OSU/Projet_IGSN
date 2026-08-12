import { filterLaboratoriesByOrgAndOsu } from "@projet-igsn/domain/institutional-group/filter-laboratories-by-org-and-osu";
import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import {
  OrganizationFilter,
  OsuFilter,
} from "#/institutional-groups/group-filters.tsx";
import { LaboratoryTable } from "#/institutional-groups/laboratory-table.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/institutional-groups/laboratories/")({
  validateSearch: z.object({
    organization: z.string().optional().catch(undefined),
    osu: z.string().optional().catch(undefined),
  }),
  component: () => (
    <SuperAdminOnly>
      <LaboratoriesPage />
    </SuperAdminOnly>
  ),
});

function LaboratoriesPage() {
  const { organization, osu } = Route.useSearch();
  const navigate = Route.useNavigate();

  const laboratories = organization
    ? filterLaboratoriesByOrgAndOsu({ organizationRor: organization, osu })
    : [...LABORATORIES];

  return (
    <>
      <h1 className="text-2xl font-bold">{m.group_laboratories_title()}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <OrganizationFilter
          value={organization}
          onChange={(value) =>
            void navigate({ search: { organization: value } })
          }
        />
        <OsuFilter
          organization={organization}
          value={osu}
          onChange={(value) =>
            void navigate({ search: { organization, osu: value } })
          }
        />
      </div>

      <LaboratoryTable laboratories={laboratories} />
    </>
  );
}
