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

import { ContactOwnerForm } from "#/domain/samples/contact-owner-form.tsx";
import { useContactSampleOwner } from "#/domain/samples/hook/contact-sample-owner.ts";
import { m } from "#/paraglide/messages.js";

export function ContactOwnerDialog({ igsn }: { igsn: string }) {
  const [open, setOpen] = useState(false);
  const { mutateAsync } = useContactSampleOwner(igsn);

  const send = async (body: ContactSampleOwnerBody) => {
    const result = await mutateAsync(body);
    if (result === "sent") {
      toast.success(m.contact_success());
      setOpen(false);
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          {m.sample_contact_owner()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.contact_title()}</DialogTitle>
        </DialogHeader>
        <ContactOwnerForm onSend={send} />
      </DialogContent>
    </Dialog>
  );
}
