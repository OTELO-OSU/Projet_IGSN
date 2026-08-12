import type { ListUsersQuery } from "@projet-igsn/domain/user/user-validator";

import { Pagination } from "#/pagination/pagination.tsx";
import { m } from "#/paraglide/messages.js";
import { useUsers } from "#/users/use-users.ts";
import { UserTable } from "#/users/user-table.tsx";

type GroupFilter = Pick<
  ListUsersQuery,
  "institutionalOrganization" | "institutionalOsu" | "institutionalLaboratory"
>;

export function GroupMembers({
  filter,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
}: {
  filter: GroupFilter;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) {
  const query = useUsers({ page, perPage, ...filter });

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  return (
    <>
      <h2 className="text-xl font-bold">{m.group_members_title()}</h2>

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
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
      />
    </>
  );
}
