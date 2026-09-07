import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import { DEFAULT_PAGE_SIZE } from "@projet-igsn/domain/sample/sample-validator";
import { createFileRoute } from "@tanstack/react-router";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { m } from "#/paraglide/messages.js";
import { useDeleteServiceAccount } from "#/service-accounts/hook/delete-service-account.ts";
import { useGetServiceAccountById } from "#/service-accounts/hook/get-service-account-by-id.ts";
import { useUpdateServiceAccount } from "#/service-accounts/hook/update-service-account.ts";
import { ServiceAccountForm } from "#/service-accounts/service-account-form.tsx";

export const Route = createFileRoute("/service-accounts/$accountId")({
  component: () => (
    <SuperAdminOnly>
      <ServiceAccountDetailPage />
    </SuperAdminOnly>
  ),
});

function ServiceAccountDetailPage() {
  const { accountId } = Route.useParams();
  const navigate = Route.useNavigate();
  const query = useGetServiceAccountById(accountId);
  const update = useUpdateServiceAccount(accountId);
  const remove = useDeleteServiceAccount(accountId);

  if (query.isPending) return <p>{m.service_account_loading()}</p>;
  if (query.isError) return <p role="alert">{m.service_account_error()}</p>;
  if (!query.data) return <p role="alert">{m.service_account_not_found()}</p>;

  const account = query.data;

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{account.name}</h1>
        <ConfirmButton
          variant="destructive"
          title={m.service_account_delete_title()}
          description={m.service_account_delete_description()}
          confirmLabel={m.action_delete()}
          cancelLabel={m.action_cancel()}
          closeLabel={m.action_close()}
          confirmPhrase={{
            text: m.action_delete_confirm_phrase(),
            label: m.action_delete_confirm_phrase_label({
              phrase: m.action_delete_confirm_phrase(),
            }),
          }}
          onConfirm={() =>
            remove.mutate(undefined, {
              onSuccess: () =>
                void navigate({
                  to: "/service-accounts",
                  search: { page: 1, perPage: DEFAULT_PAGE_SIZE },
                }),
            })
          }
        >
          {m.service_account_delete_action()}
        </ConfirmButton>
      </div>

      <ServiceAccountForm
        account={account}
        submitLabel={m.action_save()}
        onSave={(body) => update.mutateAsync(body)}
      />
    </>
  );
}
