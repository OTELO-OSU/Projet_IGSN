import { Button } from "@projet-igsn/design-system/components/ui/button";
import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { useListMyServiceAccounts } from "#/service-accounts/hook/list-my-service-accounts.ts";
import { useRotateApiKey } from "#/service-accounts/hook/rotate-api-key.ts";
import { ShareLink } from "#/settings/share-link.tsx";

export function MyServiceAccounts() {
  const query = useListMyServiceAccounts();
  const rotate = useRotateApiKey();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const accounts = query.data?.data ?? [];

  if (accounts.length === 0) return null;

  const generate = (id: string) =>
    rotate.mutate(id, {
      onSuccess: ({ apiKey }) =>
        setKeys((shown) => ({ ...shown, [id]: apiKey })),
    });

  return (
    <>
      <h2 className="text-xl font-bold">{m.settings_services_title()}</h2>
      <p className="text-muted-foreground text-sm">
        {m.settings_services_hint()}
      </p>
      <ul className="grid w-full max-w-md gap-2">
        {accounts.map((account) => {
          const apiKey = keys[account.id];
          return (
            <li key={account.id} className="grid gap-1">
              <div className="flex items-center justify-between gap-4">
                <span>{account.name}</span>
                {account.hasApiKey ? (
                  <ConfirmButton
                    variant="outline"
                    size="sm"
                    title={m.service_account_api_key_regenerate_title()}
                    description={m.service_account_api_key_regenerate_description()}
                    confirmLabel={m.service_account_api_key_regenerate()}
                    cancelLabel={m.action_cancel()}
                    closeLabel={m.action_close()}
                    onConfirm={() => generate(account.id)}
                  >
                    {m.service_account_api_key_regenerate()}
                  </ConfirmButton>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generate(account.id)}
                  >
                    {m.service_account_api_key_generate()}
                  </Button>
                )}
              </div>
              {apiKey && (
                <>
                  <ShareLink
                    canOpen={false}
                    label={m.service_account_api_key_label()}
                    link={apiKey}
                  />
                  <p className="text-muted-foreground text-sm">
                    {m.service_account_api_key_once()}
                  </p>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
