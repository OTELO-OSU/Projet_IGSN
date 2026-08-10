import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@projet-igsn/design-system/components/ui/select";
import {
  USER_STATUSES,
  userStatusSchema,
} from "@projet-igsn/domain/user/model";
import { listUsersQuerySchema } from "@projet-igsn/domain/user/user-validator";
import { createFileRoute } from "@tanstack/react-router";

import { Pagination } from "#/pagination/pagination.tsx";
import { m } from "#/paraglide/messages.js";
import { useUsers } from "#/users/use-users.ts";
import { userStatusLabel } from "#/users/user-status-label.ts";
import { UserTable } from "#/users/user-table.tsx";

export const Route = createFileRoute("/users/")({
  validateSearch: listUsersQuerySchema,
  component: UsersPage,
});

const ALL_STATUSES = "all";

function UsersPage() {
  const { page, perPage, status } = Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useUsers({ page, perPage, status });

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  return (
    <>
      <h1 className="text-2xl font-bold">{m.users_title()}</h1>

      <Select
        value={status ?? ALL_STATUSES}
        onValueChange={(value) =>
          void navigate({
            search: {
              page: 1,
              perPage,
              status:
                value === ALL_STATUSES
                  ? undefined
                  : userStatusSchema.parse(value),
            },
          })
        }
      >
        <SelectTrigger className="w-56" aria-label={m.users_status_filter()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUSES}>{m.users_status_all()}</SelectItem>
          {USER_STATUSES.map((candidate) => (
            <SelectItem key={candidate} value={candidate}>
              {userStatusLabel(candidate)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {query.isPending ? (
        <p>{m.users_loading()}</p>
      ) : query.isError ? (
        <p role="alert">{m.users_error()}</p>
      ) : (
        <UserTable users={query.data.data} />
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        perPage={perPage}
        onPageChange={(nextPage) =>
          void navigate({ search: { page: nextPage, perPage, status } })
        }
        onPerPageChange={(nextPerPage) =>
          void navigate({ search: { page: 1, perPage: nextPerPage, status } })
        }
      />
    </>
  );
}
