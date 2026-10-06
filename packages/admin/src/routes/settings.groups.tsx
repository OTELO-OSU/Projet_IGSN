import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { createFileRoute } from "@tanstack/react-router";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { InstitutionalGroupsForm } from "#/institutional-groups/institutional-groups-form.tsx";
import { useSetInstitutionalGroups } from "#/institutional-groups/use-set-institutional-groups.ts";
import { MyManualGroups } from "#/manual-groups/my-manual-groups.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/settings/groups")({
  component: GroupsPage,
});

function GroupsPage() {
  const { data, isError } = useCurrentUser();
  const setGroups = useSetInstitutionalGroups();

  return (
    <div className="flex flex-col gap-6 pb-16">
      <h1 className="text-2xl font-bold">{m.settings_groups_title()}</h1>
      {isError ? (
        <p role="alert">{m.user_name_error()}</p>
      ) : data ? (
        <>
          <FormSection
            title={m.settings_institution_title()}
            description={m.settings_institution_hint()}
          >
            <InstitutionalGroupsForm
              groups={data}
              save={setGroups}
              actionsClassName="bg-background fixed inset-x-0 bottom-0 z-40 flex flex-wrap justify-end gap-2 border-t px-6 py-3 md:left-(--sidebar-width) md:motion-safe:transition-[left] md:duration-500 md:ease-in-out"
            />
          </FormSection>
          <FormSection title={m.settings_manual_groups_title()}>
            <MyManualGroups />
          </FormSection>
        </>
      ) : (
        <p>{m.auth_loading()}</p>
      )}
    </div>
  );
}
