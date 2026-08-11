import { createFileRoute } from "@tanstack/react-router";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { InstitutionalGroupsForm } from "#/groups/institutional-groups-form.tsx";
import { m } from "#/paraglide/messages.js";
import { OrcidSettingsForm } from "#/settings/orcid-settings-form.tsx";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isError } = useCurrentUser();

  return (
    <>
      <h1 className="text-2xl font-bold">{m.settings_title()}</h1>
      {isError ? (
        <p role="alert">{m.user_name_error()}</p>
      ) : data ? (
        <>
          <OrcidSettingsForm orcid={data.orcid} />
          <h2 className="text-xl font-bold">
            {m.settings_institution_title()}
          </h2>
          <InstitutionalGroupsForm groups={data} disabled />
          <p className="text-muted-foreground text-sm">
            {m.settings_institution_hint()}
          </p>
        </>
      ) : (
        <p>{m.auth_loading()}</p>
      )}
    </>
  );
}
