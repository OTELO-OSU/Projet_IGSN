import { listManualGroupsQuerySchema } from "@projet-igsn/domain/manual-group/manual-group-validator";
import { canAdminManualGroups } from "@projet-igsn/domain/user/can-admin-manual-groups";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { RouteGuard } from "#/auth/route-guard.tsx";
import { useCurrentUser } from "#/auth/use-current-user.ts";
import { ListHeader } from "#/filters/list-header.tsx";
import { searchFilterEntry } from "#/filters/search-filter-entry.tsx";
import { CreateManualGroupDialog } from "#/manual-groups/create-manual-group-dialog.tsx";
import { ManualGroupTable } from "#/manual-groups/manual-group-table.tsx";
import { RequestManualGroupDialog } from "#/manual-groups/request-manual-group-dialog.tsx";
import { useManualGroups } from "#/manual-groups/use-manual-groups.ts";
import { Pagination } from "#/pagination/pagination.tsx";
import { m } from "#/paraglide/messages.js";

const manualGroupsSearchSchema = listManualGroupsQuerySchema.extend({
  requestedName: z.string().optional().catch(undefined),
  requestedManagerIds: z
    .string()
    .refine((ids) => z.array(z.uuid()).safeParse(ids.split(",")).success)
    .optional()
    .catch(undefined),
});

type ManualGroupsSearch = z.infer<typeof manualGroupsSearchSchema>;

export const Route = createFileRoute("/manual-groups/")({
  validateSearch: manualGroupsSearchSchema,
  component: () => (
    <RouteGuard allow={canAdminManualGroups}>
      <ManualGroupsPage />
    </RouteGuard>
  ),
});

function ManualGroupsPage() {
  const { data: me } = useCurrentUser();
  const { page, perPage, search, requestedName, requestedManagerIds } =
    Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useManualGroups({ page, perPage, search });

  const update = (next: Partial<ManualGroupsSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }) });

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const isRequestLink =
    requestedName !== undefined || requestedManagerIds !== undefined;

  return (
    <>
      <ListHeader
        title={m.manual_groups_title()}
        action={
          me?.superAdmin ? (
            <CreateManualGroupDialog
              name={requestedName}
              managerIds={requestedManagerIds?.split(",")}
              defaultOpen={isRequestLink}
              onClose={() =>
                update({
                  requestedName: undefined,
                  requestedManagerIds: undefined,
                })
              }
            />
          ) : (
            me && <RequestManualGroupDialog />
          )
        }
        filters={[
          searchFilterEntry({
            label: m.manual_groups_search_label(),
            placeholder: m.manual_groups_search_placeholder(),
            defaultValue: search,
            className: "col-span-full",
            onSearch: (value) =>
              update({ page: 1, search: value || undefined }),
          }),
        ]}
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
