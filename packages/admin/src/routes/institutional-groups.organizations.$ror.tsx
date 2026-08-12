import { ORGANIZATIONS } from "@projet-igsn/domain/institutional-group/organization";
import { listUsersQuerySchema } from "@projet-igsn/domain/user/user-validator";
import { createFileRoute } from "@tanstack/react-router";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { GroupMembers } from "#/institutional-groups/group-members.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute(
  "/institutional-groups/organizations/$ror",
)({
  validateSearch: listUsersQuerySchema,
  component: () => (
    <SuperAdminOnly>
      <OrganizationDetailPage />
    </SuperAdminOnly>
  ),
});

function OrganizationDetailPage() {
  const { ror } = Route.useParams();
  const { page, perPage } = Route.useSearch();
  const navigate = Route.useNavigate();

  const organization = ORGANIZATIONS.find((candidate) => candidate.ror === ror);
  if (!organization) {
    return <p role="alert">{m.group_not_found()}</p>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold">{organization.name}</h1>

      <dl className="grid grid-cols-[10rem_1fr] gap-2">
        <dt className="font-medium">{m.column_acronym()}</dt>
        <dd>{organization.acronym ?? m.group_value_none()}</dd>
        <dt className="font-medium">{m.column_ror()}</dt>
        <dd>{organization.ror}</dd>
      </dl>

      <GroupMembers
        filter={{ institutionalOrganization: organization.ror }}
        page={page}
        perPage={perPage}
        onPageChange={(nextPage) =>
          void navigate({ search: { page: nextPage, perPage } })
        }
        onPerPageChange={(nextPerPage) =>
          void navigate({ search: { page: 1, perPage: nextPerPage } })
        }
      />
    </>
  );
}
