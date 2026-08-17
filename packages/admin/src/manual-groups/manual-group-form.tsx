import type { ManualGroupNameBody } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { manualGroupNameBodySchema } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { m } from "#/paraglide/messages.js";

import { isNameTaken } from "./is-name-taken.ts";

export function ManualGroupForm({
  name = "",
  submitLabel,
  onSave,
}: {
  name?: string;
  submitLabel: string;
  onSave: (body: ManualGroupNameBody) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: { name },
    validators: {
      onSubmitAsync: async ({ value }) => {
        const parsed = manualGroupNameBodySchema.safeParse(value);
        if (!parsed.success) {
          return {
            fields: {
              name: { message: m.field_manual_group_name_required() },
            },
          };
        }
        try {
          await onSave(parsed.data);
          return undefined;
        } catch (error) {
          return isNameTaken(error)
            ? { fields: { name: { message: m.manual_group_name_taken() } } }
            : undefined;
        }
      },
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="grid w-full max-w-md gap-4"
    >
      <form.AppField name="name">
        {(field) => <field.TextField label={m.field_manual_group_name()} />}
      </form.AppField>
      <div>
        <form.AppForm>
          <form.SubmitButton label={submitLabel} />
        </form.AppForm>
      </div>
    </form>
  );
}
