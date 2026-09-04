import { Button } from "@projet-igsn/design-system/components/ui/button";
import { listServiceAccountsQuerySchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { Link, createFileRoute } from "@tanstack/react-router";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { ListHeader } from "#/filters/list-header.tsx";
import { Pagination } from "#/pagination/pagination.tsx";
import { m } from "#/paraglide/messages.js";
import { useListServiceAccounts } from "#/service-accounts/hook/list-service-accounts.ts";
import { ServiceAccountTable } from "#/service-accounts/service-account-table.tsx";

export const Route = createFileRoute("/service-accounts/")({
  validateSearch: listServiceAccountsQuerySchema,
  component: () => (
    <SuperAdminOnly>
      <ServiceAccountsPage />
    </SuperAdminOnly>
  ),
});

function ServiceAccountsPage() {
  const { page, perPage } = Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useListServiceAccounts({ page, perPage });

  const total = query.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  return (
    <>
      <ListHeader
        title={m.service_accounts_title()}
        action={
          <Button asChild>
            <Link to="/service-accounts/create">
              {m.service_account_create_action()}
            </Link>
          </Button>
        }
        filters={[]}
      />

      {query.isPending ? (
        <p>{m.service_accounts_loading()}</p>
      ) : query.isError ? (
        <p role="alert">{m.service_accounts_error()}</p>
      ) : (
        <ServiceAccountTable accounts={query.data.data} />
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        perPage={perPage}
        onPageChange={(nextPage) =>
          void navigate({ search: (prev) => ({ ...prev, page: nextPage }) })
        }
        onPerPageChange={(nextPerPage) =>
          void navigate({
            search: (prev) => ({ ...prev, page: 1, perPage: nextPerPage }),
          })
        }
      />
    </>
  );
}
