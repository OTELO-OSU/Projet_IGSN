import type { CreateManualGroupBody } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import {
  createManualGroupBodySchema,
  requestManualGroupBodySchema,
} from "@projet-igsn/domain/manual-group/manual-group-validator";

import { m } from "#/paraglide/messages.js";

import { isNameTaken } from "./is-name-taken.ts";
import { ManualGroupManagersField } from "./manual-group-managers-field.tsx";

export function ManualGroupForm({
  name = "",
  managerIds,
  requireManager = false,
  submitLabel,
  onSave,
}: {
  name?: string;
  managerIds?: string[];
  requireManager?: boolean;
  submitLabel: string;
  onSave: (body: CreateManualGroupBody) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: { name, managerIds: managerIds ?? [] },
    validators: {
      onSubmitAsync: async ({ value }) => {
        const parsed = requireManager
          ? requestManualGroupBodySchema.safeParse(value)
          : createManualGroupBodySchema.safeParse(value);
        if (!parsed.success) {
          const invalid = new Set(
            parsed.error.issues.map((issue) => issue.path[0]),
          );
          return {
            fields: {
              ...(invalid.has("managerIds") && {
                managerIds: {
                  message: m.field_manual_group_managers_required(),
                },
              }),
              ...(invalid.has("name") && {
                name: { message: m.field_manual_group_name_required() },
              }),
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
      {managerIds === undefined ? null : (
        <form.AppField name="managerIds">
          {() => <ManualGroupManagersField />}
        </form.AppField>
      )}
      <div>
        <form.AppForm>
          <form.SubmitButton label={submitLabel} />
        </form.AppForm>
      </div>
    </form>
  );
}
