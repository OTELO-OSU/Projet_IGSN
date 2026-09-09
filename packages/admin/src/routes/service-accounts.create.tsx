import { serviceAccountDraftSchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { m } from "#/paraglide/messages.js";
import { useCreateServiceAccount } from "#/service-accounts/hook/create-service-account.ts";
import { ServiceAccountForm } from "#/service-accounts/service-account-form.tsx";

export const Route = createFileRoute("/service-accounts/create")({
  validateSearch: z.object({
    request: serviceAccountDraftSchema.optional().catch(undefined),
  }),
  component: () => (
    <SuperAdminOnly>
      <CreateServiceAccountPage />
    </SuperAdminOnly>
  ),
});

function CreateServiceAccountPage() {
  const navigate = Route.useNavigate();
  const { request } = Route.useSearch();
  const create = useCreateServiceAccount();

  return (
    <>
      <h1 className="text-2xl font-bold">{m.service_account_create_title()}</h1>

      <ServiceAccountForm
        draft={request}
        submitLabel={m.action_create()}
        onSave={async (body) => {
          const account = await create.mutateAsync(body);
          await navigate({
            to: "/service-accounts/$accountId",
            params: { accountId: account.id },
          });
        }}
      />
    </>
  );
}
