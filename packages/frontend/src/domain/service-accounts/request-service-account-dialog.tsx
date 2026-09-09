import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { Suspense, lazy, useState } from "react";
import { useAuth } from "react-oidc-context";

import { m } from "#/paraglide/messages.js";

const RequestServiceAccountForm = lazy(() =>
  import("#/domain/service-accounts/request-service-account-form.tsx").then(
    (module) => ({ default: module.RequestServiceAccountForm }),
  ),
);

export function RequestServiceAccountDialog() {
  const [open, setOpen] = useState(false);
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          {m.service_account_request_action()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.service_account_request_action()}</DialogTitle>
        </DialogHeader>
        <Suspense fallback={null}>
          <RequestServiceAccountForm onSent={() => setOpen(false)} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
