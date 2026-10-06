import type { ContactSampleOwnerBody } from "@projet-igsn/domain/sample/sample-validator";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useState } from "react";

import type { ContactRecipient } from "#/domain/samples/client/contact-sample-owner.ts";

import { ContactOwnerForm } from "#/domain/samples/contact-owner-form.tsx";
import { useContactSampleOwner } from "#/domain/samples/hook/contact-sample-owner.ts";
import { m } from "#/paraglide/messages.js";

const MESSAGES: Record<
  ContactRecipient,
  Record<"trigger" | "title" | "success" | "noRecipient", () => string>
> = {
  owner: {
    trigger: m.sample_contact_owner,
    title: m.contact_title,
    success: m.contact_success,
    noRecipient: m.contact_no_recipient,
  },
  archive: {
    trigger: m.sample_contact_archive,
    title: m.contact_archive_title,
    success: m.contact_archive_success,
    noRecipient: m.contact_archive_no_recipient,
  },
};

export function ContactOwnerDialog({
  igsn,
  recipient,
}: {
  igsn: string;
  recipient: ContactRecipient;
}) {
  const [open, setOpen] = useState(false);
  const { mutateAsync } = useContactSampleOwner(igsn, recipient);
  const messages = MESSAGES[recipient];

  const send = async (body: ContactSampleOwnerBody) => {
    const result = await mutateAsync(body);
    if (result === "sent") {
      toast.success(messages.success());
      setOpen(false);
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          {messages.trigger()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{messages.title()}</DialogTitle>
        </DialogHeader>
        <ContactOwnerForm
          title={messages.title()}
          noRecipientMessage={messages.noRecipient()}
          onSend={send}
        />
      </DialogContent>
    </Dialog>
  );
}
