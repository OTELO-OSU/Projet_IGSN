import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { orcidSchema } from "@projet-igsn/domain/user/orcid";

import { m } from "#/paraglide/messages.js";

import { useSetOrcid } from "./use-set-orcid.ts";

// Empty means "no ORCID": the field clears the stored value rather than
// erroring, so a typo'd link can be removed.
const isValid = (orcid: string) =>
  orcid.trim() === "" || orcidSchema.safeParse(orcid).success;

export function OrcidSettingsForm({ orcid }: { orcid: string | null }) {
  const setOrcid = useSetOrcid();
  const form = useAppForm({
    defaultValues: { orcid: orcid ?? "" },
    validators: {
      onSubmit: ({ value }) =>
        isValid(value.orcid)
          ? undefined
          : { fields: { orcid: { message: m.field_orcid_invalid() } } },
    },
    onSubmit: ({ value }) => {
      const trimmed = value.orcid.trim();
      setOrcid.mutate(trimmed === "" ? null : trimmed);
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex max-w-md flex-col gap-4"
    >
      <form.AppField name="orcid">
        {(field) => <field.TextField label={m.field_orcid()} />}
      </form.AppField>
      <p className="text-muted-foreground text-sm">{m.settings_orcid_hint()}</p>
      <div>
        <form.AppForm>
          <form.SubmitButton
            label={m.action_save()}
            disabled={setOrcid.isPending}
          />
        </form.AppForm>
      </div>
    </form>
  );
}
