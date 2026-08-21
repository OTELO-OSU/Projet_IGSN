import type { ListManualGroupsQuery } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { listManualGroupsQuerySchema } from "@projet-igsn/domain/manual-group/manual-group-validator";
import { canAdminManualGroups } from "@projet-igsn/domain/user/can-admin-manual-groups";
import { createFileRoute } from "@tanstack/react-router";

import { RouteGuard } from "#/auth/route-guard.tsx";
import { useCurrentUser } from "#/auth/use-current-user.ts";
import { CreateManualGroupDialog } from "#/manual-groups/create-manual-group-dialog.tsx";
import { ManualGroupTable } from "#/manual-groups/manual-group-table.tsx";
import { useManualGroups } from "#/manual-groups/use-manual-groups.ts";
import { Pagination } from "#/pagination/pagination.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/manual-groups/")({
  validateSearch: listManualGroupsQuerySchema,
  component: () => (
    <RouteGuard allow={canAdminManualGroups}>
      <ManualGroupsPage />
    </RouteGuard>
  ),
});

function ManualGroupsPage() {
  const { data: me } = useCurrentUser();
  const { page, perPage, search } = Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useManualGroups({ page, perPage, search });

  const update = (next: Partial<ListManualGroupsQuery>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }) });

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{m.manual_groups_title()}</h1>
        {me?.superAdmin && <CreateManualGroupDialog />}
      </div>

      <SearchField
        defaultValue={search}
        label={m.manual_groups_search_label()}
        placeholder={m.manual_groups_search_placeholder()}
        onSearch={(value) => update({ page: 1, search: value || undefined })}
      />

      {query.isPending ? (
        <p>{m.manual_groups_loading()}</p>
      ) : query.isError ? (
        <p role="alert">{m.manual_groups_error()}</p>
      ) : (
        <ManualGroupTable groups={query.data.data} />
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
