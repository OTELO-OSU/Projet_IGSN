import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { useState } from "react";

import { RequestServiceAccountForm } from "#/domain/service-accounts/request-service-account-form.tsx";
import { m } from "#/paraglide/messages.js";

export function RequestServiceAccountDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          {m.service_account_request_action()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.service_account_request_action()}</DialogTitle>
        </DialogHeader>
        <RequestServiceAccountForm onSent={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
