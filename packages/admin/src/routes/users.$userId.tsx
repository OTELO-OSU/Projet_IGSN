import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { createFileRoute } from "@tanstack/react-router";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { m } from "#/paraglide/messages.js";
import { useSetUserStatus } from "#/users/use-set-user-status.ts";
import { useUser } from "#/users/use-user.ts";
import { UserStatusBadge } from "#/users/user-status-badge.tsx";

export const Route = createFileRoute("/users/$userId")({
  component: () => (
    <SuperAdminOnly>
      <UserDetailPage />
    </SuperAdminOnly>
  ),
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const query = useUser(userId);
  const setStatus = useSetUserStatus(userId);

  if (query.isPending) {
    return <p>{m.user_loading()}</p>;
  }
  if (query.isError) {
    return <p role="alert">{m.user_error()}</p>;
  }
  if (!query.data) {
    return <p role="alert">{m.user_not_found()}</p>;
  }

  const user = query.data;
  const acceptBlocked = setStatus.isPending || user.status === "accepted";
  const rejectBlocked = setStatus.isPending || user.status === "rejected";

  return (
    <>
      <h1 className="text-2xl font-bold">{m.user_detail_title()}</h1>

      <dl className="grid grid-cols-[10rem_1fr] gap-2">
        <dt className="font-medium">{m.column_name()}</dt>
        <dd>{user.name ?? m.user_value_missing()}</dd>
        <dt className="font-medium">{m.column_firstname()}</dt>
        <dd>{user.firstname ?? m.user_value_missing()}</dd>
        <dt className="font-medium">{m.column_email()}</dt>
        <dd>{user.email}</dd>
        <dt className="font-medium">{m.column_status()}</dt>
        <dd>
          <UserStatusBadge status={user.status} />
        </dd>
        <dt className="font-medium">{m.field_institutional_organization()}</dt>
        <dd>
          {user.institutionalOrganization === null
            ? m.user_value_missing()
            : organizationLabel(user.institutionalOrganization)}
        </dd>
        <dt className="font-medium">{m.column_institutional_osu()}</dt>
        <dd>
          {user.institutionalOsu === null
            ? m.user_value_missing()
            : osuLabel(user.institutionalOsu)}
        </dd>
        <dt className="font-medium">{m.field_institutional_laboratory()}</dt>
        <dd>
          {user.institutionalLaboratory === null
            ? m.user_value_missing()
            : laboratoryLabel(user.institutionalLaboratory)}
        </dd>
      </dl>

      <div className="flex gap-3">
        <Button
          type="button"
          disabled={acceptBlocked}
          onClick={() => setStatus.mutate("accepted")}
        >
          {m.action_activate()}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={rejectBlocked}
          onClick={() => setStatus.mutate("rejected")}
        >
          {m.action_deactivate()}
        </Button>
      </div>
    </>
  );
}
