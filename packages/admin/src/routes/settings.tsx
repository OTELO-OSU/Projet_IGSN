import { createFileRoute } from "@tanstack/react-router";

import { m } from "#/paraglide/messages.js";
import { OrcidSettingsForm } from "#/settings/orcid-settings-form.tsx";
import { useGetMe } from "#/use-get-me.ts";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isError } = useGetMe();

  return (
    <>
      <h1 className="text-2xl font-bold">{m.settings_title()}</h1>
      {isError ? (
        <p role="alert">{m.user_name_error()}</p>
      ) : data ? (
        <OrcidSettingsForm orcid={data.orcid} />
      ) : (
        <p>{m.auth_loading()}</p>
      )}
    </>
  );
}
