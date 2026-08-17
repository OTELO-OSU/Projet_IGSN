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

export function CreateManualGroupDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const createGroup = useCreateManualGroup();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
          submitLabel={m.action_create()}
          onSave={(body) =>
            createGroup.mutateAsync(body).then(() => setIsOpen(false))
          }
        />
      </DialogContent>
    </Dialog>
  );
}
