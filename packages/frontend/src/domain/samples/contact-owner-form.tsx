import type { ContactAdminBody } from "@projet-igsn/domain/contact/contact-validator";
import type { ContactSampleOwnerBody } from "@projet-igsn/domain/sample/sample-validator";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { contactAdminBodySchema } from "@projet-igsn/domain/contact/contact-validator";
import { zodFieldErrors } from "@projet-igsn/domain/form/zod-field-errors";
import { contactSampleOwnerBodySchema } from "@projet-igsn/domain/sample/sample-validator";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";

const ISSUE_MESSAGE: Record<string, () => string> = {
  invalid_format: () => m.contact_field_email_invalid(),
  too_big: () => m.contact_field_too_long(),
};

const messageOf = (issue: { code: string }) =>
  (ISSUE_MESSAGE[issue.code] ?? (() => m.field_required()))();

const validateOwnerBody = zodFieldErrors(
  contactSampleOwnerBodySchema,
  messageOf,
);
const validateAdminBody = zodFieldErrors(contactAdminBodySchema, messageOf);

type ContactResult = "sent" | "no_recipient" | "rate_limited";

type ContactOwnerFormProps = {
  title: string;
  noRecipientMessage?: string;
} & (
  | {
      withSubject?: false;
      onSend: (body: ContactSampleOwnerBody) => Promise<ContactResult>;
    }
  | {
      withSubject: true;
      onSend: (body: ContactAdminBody) => Promise<ContactResult>;
    }
);

const ownerBodyOf = ({
  subject: _subject,
  ...body
}: ContactAdminBody): ContactSampleOwnerBody => body;

export function ContactOwnerForm(props: ContactOwnerFormProps) {
  const { title, noRecipientMessage = "" } = props;
  const [statusMessage, setStatusMessage] = useState("");
  const form = useAppForm({
    defaultValues: {
      subject: "",
      name: "",
      firstname: "",
      email: "",
      message: "",
    },
    validators: {
      onSubmit: ({ value }) =>
        props.withSubject
          ? validateAdminBody({ value })
          : validateOwnerBody({ value: ownerBodyOf(value) }),
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await (props.withSubject
          ? props.onSend(value)
          : props.onSend(ownerBodyOf(value)));
        setStatusMessage(
          {
            sent: "",
            no_recipient: noRecipientMessage,
            rate_limited: m.contact_rate_limited(),
          }[result],
        );
      } catch {
        setStatusMessage(m.contact_error());
      }
    },
  });

  return (
    <div className="grid gap-4">
      <p role="status">{statusMessage}</p>
      <form
        noValidate
        aria-label={title}
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
        className="grid gap-4"
      >
        <form.AppField name="name">
          {(field) => (
            <field.TextField label={m.contact_field_name()} isFullWidth />
          )}
        </form.AppField>
        <form.AppField name="firstname">
          {(field) => (
            <field.TextField label={m.contact_field_firstname()} isFullWidth />
          )}
        </form.AppField>
        <form.AppField name="email">
          {(field) => (
            <field.TextField label={m.contact_field_email()} isFullWidth />
          )}
        </form.AppField>
        {props.withSubject ? (
          <form.AppField name="subject">
            {(field) => (
              <field.TextField label={m.contact_field_subject()} isFullWidth />
            )}
          </form.AppField>
        ) : null}
        <form.AppField name="message">
          {(field) => (
            <field.TextField
              label={m.contact_field_message()}
              multiline
              isFullWidth
            />
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
