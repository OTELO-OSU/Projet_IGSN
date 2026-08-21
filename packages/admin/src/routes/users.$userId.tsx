import { fullName } from "@projet-igsn/domain/user/full-name";
import { createFileRoute } from "@tanstack/react-router";

import { UserModerationOnly } from "#/auth/user-moderation-only.tsx";
import { m } from "#/paraglide/messages.js";
import { useUpdateUser } from "#/users/use-update-user.ts";
import { useUser } from "#/users/use-user.ts";
import { UserForm } from "#/users/user-form.tsx";

export const Route = createFileRoute("/users/$userId")({
  component: () => (
    <UserModerationOnly>
      <UserDetailPage />
    </UserModerationOnly>
  ),
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const query = useUser(userId);
  const update = useUpdateUser(userId);

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

  return (
    <>
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{fullName(user) || user.email}</h1>
        <p className="text-muted-foreground">{user.email}</p>
      </div>

      <UserForm user={user} save={update} />
    </>
  );
}
