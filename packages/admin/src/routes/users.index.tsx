import type { z } from "zod";

import { institutionFilterSchema } from "@projet-igsn/domain/institutional-group/institution-filter";
import { USER_STATUSES } from "@projet-igsn/domain/user/model";
import { listUsersQuerySchema } from "@projet-igsn/domain/user/user-validator";
import { createFileRoute } from "@tanstack/react-router";

import { UserModerationOnly } from "#/auth/user-moderation-only.tsx";
import { ListHeader } from "#/filters/list-header.tsx";
import { searchFilterEntry } from "#/filters/search-filter-entry.tsx";
import { SelectFilter } from "#/filters/select-filter.tsx";
import { institutionFilterEntry } from "#/institutional-groups/institution-tree-filter.tsx";
import { manualGroupFilterEntry } from "#/manual-groups/manual-group-filter.tsx";
import { Pagination } from "#/pagination/pagination.tsx";
import { m } from "#/paraglide/messages.js";
import { institutionUserParams } from "#/users/institution-user-params.ts";
import { useUsers } from "#/users/use-users.ts";
import { userStatusLabel } from "#/users/user-status-label.ts";
import { UserTable } from "#/users/user-table.tsx";

const searchSchema = listUsersQuerySchema.extend({
  institution: institutionFilterSchema.optional().catch(undefined),
});

export const Route = createFileRoute("/users/")({
  validateSearch: searchSchema,
  component: () => (
    <UserModerationOnly>
      <UsersPage />
    </UserModerationOnly>
  ),
});

type UsersSearch = z.infer<typeof searchSchema>;

function UsersPage() {
  const { page, perPage, status, search, institution, manualGroup } =
    Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useUsers({
    page,
    perPage,
    status,
    search,
    manualGroup,
    ...institutionUserParams(institution),
  });

  const update = (next: Partial<UsersSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }) });

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  return (
    <>
      <ListHeader
        title={m.users_title()}
        filters={[
          searchFilterEntry({
            label: m.users_search_label(),
            placeholder: m.users_search_placeholder(),
            defaultValue: search,
            className: "col-span-3",
            onSearch: (value) =>
              update({ page: 1, search: value || undefined }),
          }),
          {
            name: "status",
            label: m.users_status_filter(),
            cell: (
              <SelectFilter
                id="status-filter"
                label={m.users_status_filter()}
                anyLabel={m.users_status_all()}
                items={USER_STATUSES.map((candidate) => ({
                  value: candidate,
                  label: userStatusLabel(candidate),
                }))}
                value={status}
                onChange={(value) =>
                  update({
                    page: 1,
                    status: searchSchema.shape.status.parse(value),
                  })
                }
              />
            ),
          },
          institutionFilterEntry({
            value: institution,
            onChange: (next) => update({ page: 1, institution: next }),
            onRemove: () => update({ page: 1, institution: undefined }),
          }),
          manualGroupFilterEntry({
            value: manualGroup,
            onChange: (next) => update({ page: 1, manualGroup: next }),
            onRemove: () => update({ page: 1, manualGroup: undefined }),
          }),
        ]}
      />

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
        onPageChange={(nextPage) => update({ page: nextPage })}
        onPerPageChange={(nextPerPage) =>
          update({ page: 1, perPage: nextPerPage })
        }
      />
    </>
  );
}
