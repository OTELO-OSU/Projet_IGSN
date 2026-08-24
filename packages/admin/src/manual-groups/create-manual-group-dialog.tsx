import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";

import { ManualGroupForm } from "./manual-group-form.tsx";
import { useCreateManualGroup } from "./use-create-manual-group.ts";

export function CreateManualGroupDialog({
  name,
  managerIds = [],
  defaultOpen = false,
  onClose,
}: {
  name?: string;
  managerIds?: string[];
  defaultOpen?: boolean;
  onClose?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const createGroup = useCreateManualGroup();
  const setOpen = (next: boolean) => {
    setIsOpen(next);
    if (!next) {
      onClose?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <PlusIcon aria-hidden />
          {m.manual_group_create_action()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.manual_group_create_title()}</DialogTitle>
          <DialogDescription>
            {m.manual_group_create_description()}
          </DialogDescription>
        </DialogHeader>
        <ManualGroupForm
          name={name}
          managerIds={managerIds}
          submitLabel={m.action_create()}
          onSave={(body) =>
            createGroup.mutateAsync(body).then(() => setOpen(false))
          }
        />
      </DialogContent>
    </Dialog>
  );
}
