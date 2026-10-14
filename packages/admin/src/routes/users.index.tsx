import type { UserRole } from "@projet-igsn/domain/user/model";
import type { z } from "zod";

import { Label } from "@projet-igsn/design-system/components/ui/label";
import { MultiCombobox } from "@projet-igsn/design-system/components/ui/multi-combobox";
import { institutionFilterSchema } from "@projet-igsn/domain/institutional-group/institution-filter";
import { canModerateUsers } from "@projet-igsn/domain/user/can-moderate-users";
import { USER_ROLES, USER_STATUSES } from "@projet-igsn/domain/user/model";
import { listUsersQuerySchema } from "@projet-igsn/domain/user/user-validator";
import { createFileRoute } from "@tanstack/react-router";

import { RouteGuard } from "#/auth/route-guard.tsx";
import { useCurrentUser } from "#/auth/use-current-user.ts";
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
    <RouteGuard allow={canModerateUsers}>
      <UsersPage />
    </RouteGuard>
  ),
});

type UsersSearch = z.infer<typeof searchSchema>;

const ROLE_LABELS: Record<UserRole, () => string> = {
  super_admin: m.user_role_super_admin,
  space_manager: m.user_role_space_manager,
  regular: m.user_role_regular,
};

function UsersPage() {
  const { page, perPage, status, search, institution, manualGroup, roles } =
    Route.useSearch();
  const navigate = Route.useNavigate();
  const isSuperAdmin = useCurrentUser().data?.superAdmin === true;
  const query = useUsers({
    page,
    perPage,
    status,
    search,
    manualGroup,
    roles,
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
          {
            name: "roles",
            label: m.users_role_filter(),
            active: roles !== undefined,
            onRemove: () => update({ page: 1, roles: undefined }),
            cell: (
              <>
                <Label htmlFor="roles-filter">{m.users_role_filter()}</Label>
                <MultiCombobox
                  id="roles-filter"
                  items={USER_ROLES.filter(
                    (role) => isSuperAdmin || role !== "super_admin",
                  ).map((role) => ({
                    value: role,
                    label: ROLE_LABELS[role](),
                  }))}
                  values={roles ?? []}
                  onChange={(next) =>
                    update({
                      page: 1,
                      roles: searchSchema.shape.roles.parse(next),
                    })
                  }
                  placeholder={m.users_role_all()}
                  searchPlaceholder={m.users_role_search_placeholder()}
                  emptyText={m.users_role_empty()}
                  removeLabel={(name) => m.users_role_remove({ name })}
                />
              </>
            ),
          },
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
