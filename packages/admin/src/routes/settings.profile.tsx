import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { createFileRoute } from "@tanstack/react-router";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { frontendSearchUrl } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";
import { MyServiceAccounts } from "#/service-accounts/my-service-accounts.tsx";
import { GroupSamplesLink } from "#/settings/group-samples-link.tsx";
import { OrcidSettingsForm } from "#/settings/orcid-settings-form.tsx";
import { ShareLink } from "#/settings/share-link.tsx";

export const Route = createFileRoute("/settings/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data, isError } = useCurrentUser();

  return (
    <div className="flex flex-col gap-6 pb-16">
      <h1 className="text-2xl font-bold">{m.settings_profile_title()}</h1>
      {isError ? (
        <p role="alert">{m.user_name_error()}</p>
      ) : data ? (
        <>
          <FormSection
            title={m.field_orcid()}
            description={m.settings_orcid_hint()}
          >
            <OrcidSettingsForm orcid={data.orcid} />
          </FormSection>
          {data.status === "accepted" && (
            <>
              <FormSection title={m.settings_samples_links_title()}>
                <FormSection
                  level={3}
                  title={m.settings_my_samples_title()}
                  description={m.settings_my_samples_hint()}
                >
                  <ShareLink
                    label={m.settings_my_samples_link()}
                    link={frontendSearchUrl({ contributor: data.id })}
                  />
                </FormSection>
                <FormSection
                  level={3}
                  title={m.settings_group_samples_title()}
                  description={m.settings_group_samples_hint()}
                >
                  <GroupSamplesLink />
                </FormSection>
              </FormSection>
              <MyServiceAccounts />
            </>
          )}
        </>
      ) : (
        <p>{m.auth_loading()}</p>
      )}
    </div>
  );
}
