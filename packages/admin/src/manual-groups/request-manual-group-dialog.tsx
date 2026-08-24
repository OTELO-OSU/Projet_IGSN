import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { SendIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";

import { ManualGroupForm } from "./manual-group-form.tsx";
import { useRequestManualGroup } from "./use-request-manual-group.ts";

export function RequestManualGroupDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const requestGroup = useRequestManualGroup();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <SendIcon aria-hidden />
          {m.manual_group_request_action()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.manual_group_request_title()}</DialogTitle>
          <DialogDescription>
            {m.manual_group_request_description()}
          </DialogDescription>
        </DialogHeader>
        <ManualGroupForm
          managerIds={[]}
          requireManager
          submitLabel={m.manual_group_request_submit()}
          onSave={(body) =>
            requestGroup.mutateAsync(body).then(() => setIsOpen(false))
          }
        />
      </DialogContent>
    </Dialog>
  );
}
