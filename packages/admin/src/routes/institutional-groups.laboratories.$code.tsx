import {
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { listUsersQuerySchema } from "@projet-igsn/domain/user/user-validator";
import { createFileRoute } from "@tanstack/react-router";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { GroupMembers } from "#/institutional-groups/group-members.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute(
  "/institutional-groups/laboratories/$code",
)({
  validateSearch: listUsersQuerySchema,
  component: () => (
    <SuperAdminOnly>
      <LaboratoryDetailPage />
    </SuperAdminOnly>
  ),
});

function LaboratoryDetailPage() {
  const { code } = Route.useParams();
  const { page, perPage } = Route.useSearch();
  const navigate = Route.useNavigate();

  const laboratory = LABORATORIES.find((candidate) => candidate.code === code);
  if (!laboratory) {
    return <p role="alert">{m.group_not_found()}</p>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold">{laboratory.name}</h1>

      <dl className="grid grid-cols-[10rem_1fr] gap-2">
        <dt className="font-medium">{m.column_acronym()}</dt>
        <dd>{laboratory.acronym}</dd>
        <dt className="font-medium">{m.column_code()}</dt>
        <dd>{laboratory.code}</dd>
        <dt className="font-medium">{m.column_institutional_osu()}</dt>
        <dd>
          {laboratory.osu === null
            ? m.group_value_none()
            : osuLabel(laboratory.osu)}
        </dd>
        <dt className="font-medium">
          {m.column_institutional_organizations()}
        </dt>
        <dd>
          <ul>
            {laboratory.organizationRors.map((ror) => (
              <li key={ror}>{organizationLabel(ror)}</li>
            ))}
          </ul>
        </dd>
      </dl>

      <GroupMembers
        filter={{ institutionalLaboratory: laboratory.code }}
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
