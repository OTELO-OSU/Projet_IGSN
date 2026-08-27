import { createFileRoute } from "@tanstack/react-router";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { frontendSearchUrl } from "#/frontend-url.ts";
import { InstitutionalGroupsForm } from "#/institutional-groups/institutional-groups-form.tsx";
import { useSetInstitutionalGroups } from "#/institutional-groups/use-set-institutional-groups.ts";
import { MyManualGroups } from "#/manual-groups/my-manual-groups.tsx";
import { m } from "#/paraglide/messages.js";
import { GroupSamplesLink } from "#/settings/group-samples-link.tsx";
import { OrcidSettingsForm } from "#/settings/orcid-settings-form.tsx";
import { ShareLink } from "#/settings/share-link.tsx";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isError } = useCurrentUser();
  const setGroups = useSetInstitutionalGroups();

  return (
    <>
      <h1 className="text-2xl font-bold">{m.settings_title()}</h1>
      {isError ? (
        <p role="alert">{m.user_name_error()}</p>
      ) : data ? (
        <>
          <OrcidSettingsForm orcid={data.orcid} />
          {data.status === "accepted" && (
            <>
              <h2 className="text-xl font-bold">
                {m.settings_my_samples_title()}
              </h2>
              <p className="text-muted-foreground text-sm">
                {m.settings_my_samples_hint()}
              </p>
              <ShareLink
                label={m.settings_my_samples_link()}
                link={frontendSearchUrl({ contributor: data.id })}
              />
              <h2 className="text-xl font-bold">
                {m.settings_group_samples_title()}
              </h2>
              <p className="text-muted-foreground text-sm">
                {m.settings_group_samples_hint()}
              </p>
              <GroupSamplesLink />
            </>
          )}
          <h2 className="text-xl font-bold">
            {m.settings_institution_title()}
          </h2>
          <InstitutionalGroupsForm groups={data} save={setGroups} />
          <p className="text-muted-foreground text-sm">
            {m.settings_institution_hint()}
          </p>
          <h2 className="text-xl font-bold">
            {m.settings_manual_groups_title()}
          </h2>
          <MyManualGroups />
        </>
      ) : (
        <p>{m.auth_loading()}</p>
      )}
    </>
  );
}
