import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { orcidSchema } from "@projet-igsn/domain/user/orcid";

import { m } from "#/paraglide/messages.js";

import { useSetOrcid } from "./use-set-orcid.ts";

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
      aria-label={m.field_orcid()}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <form.AppField name="orcid">
        {(field) => <field.TextField label={m.field_orcid()} />}
      </form.AppField>
      <div className="bg-background fixed inset-x-0 bottom-0 z-40 flex flex-wrap justify-end gap-2 border-t px-6 py-3 md:left-64">
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
