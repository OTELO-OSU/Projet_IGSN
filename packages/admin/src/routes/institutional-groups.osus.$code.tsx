import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { OSUS } from "@projet-igsn/domain/institutional-group/osu";
import { listUsersQuerySchema } from "@projet-igsn/domain/user/user-validator";
import { createFileRoute } from "@tanstack/react-router";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { GroupMembers } from "#/institutional-groups/group-members.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/institutional-groups/osus/$code")({
  validateSearch: listUsersQuerySchema,
  component: () => (
    <SuperAdminOnly>
      <OsuDetailPage />
    </SuperAdminOnly>
  ),
});

function OsuDetailPage() {
  const { code } = Route.useParams();
  const { page, perPage } = Route.useSearch();
  const navigate = Route.useNavigate();

  const osu = OSUS.find((candidate) => candidate.code === code);
  if (!osu) {
    return <p role="alert">{m.group_not_found()}</p>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold">{osu.name}</h1>

      <dl className="grid grid-cols-[10rem_1fr] gap-2">
        <dt className="font-medium">{m.column_code()}</dt>
        <dd>{osu.code}</dd>
        <dt className="font-medium">{m.field_institutional_organization()}</dt>
        <dd>{organizationLabel(osu.organizationRor)}</dd>
      </dl>

      <GroupMembers
        filter={{ institutionalOsu: osu.code }}
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
