import type { ContactSampleOwnerBody } from "@projet-igsn/domain/sample/sample-validator";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { contactSampleOwnerBodySchema } from "@projet-igsn/domain/sample/sample-validator";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";

const ISSUE_MESSAGE: Record<string, () => string> = {
  invalid_format: () => m.contact_field_email_invalid(),
  too_big: () => m.contact_field_too_long(),
};

const validate = ({ value }: { value: unknown }) => {
  const parsed = contactSampleOwnerBodySchema.safeParse(value);
  if (parsed.success) {
    return undefined;
  }
  return {
    fields: Object.fromEntries(
      parsed.error.issues.map((issue) => [
        issue.path.join("."),
        {
          message: (
            ISSUE_MESSAGE[issue.code] ?? (() => m.contact_field_required())
          )(),
        },
      ]),
    ),
  };
};

export function ContactOwnerForm({
  onSend,
}: {
  onSend: (body: ContactSampleOwnerBody) => Promise<"sent" | "no_recipient">;
}) {
  const [statusMessage, setStatusMessage] = useState("");
  const form = useAppForm({
    defaultValues: { name: "", firstname: "", email: "", message: "" },
    validators: { onSubmit: validate },
    onSubmit: async ({ value }) => {
      try {
        const result = await onSend(value);
        setStatusMessage(
          result === "no_recipient" ? m.contact_no_recipient() : "",
        );
      } catch {
        setStatusMessage(m.contact_error());
      }
    },
  });

  return (
    <div className="grid w-full max-w-md gap-4">
      <p role="status">{statusMessage}</p>
      <form
        noValidate
        aria-label={m.contact_title()}
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
        className="grid gap-4"
      >
        <form.AppField name="name">
          {(field) => <field.TextField label={m.contact_field_name()} />}
        </form.AppField>
        <form.AppField name="firstname">
          {(field) => <field.TextField label={m.contact_field_firstname()} />}
        </form.AppField>
        <form.AppField name="email">
          {(field) => <field.TextField label={m.contact_field_email()} />}
        </form.AppField>
        <form.AppField name="message">
          {(field) => (
            <field.TextField label={m.contact_field_message()} multiline />
          )}
        </form.AppField>
        <div>
          <form.AppForm>
            <form.SubmitButton label={m.contact_submit()} />
          </form.AppForm>
        </div>
      </form>
    </div>
  );
}
