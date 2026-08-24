import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { PencilIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";

import { ManualGroupForm } from "./manual-group-form.tsx";
import { useRenameManualGroup } from "./use-rename-manual-group.ts";

export function RenameManualGroupDialog({
  groupId,
  name,
}: {
  groupId: string;
  name: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rename = useRenameManualGroup(groupId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={m.manual_group_rename_action()}
            >
              <PencilIcon aria-hidden />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{m.manual_group_rename_action()}</TooltipContent>
      </Tooltip>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.manual_group_rename_title()}</DialogTitle>
          <DialogDescription>
            {m.manual_group_rename_description()}
          </DialogDescription>
        </DialogHeader>
        <ManualGroupForm
          name={name}
          submitLabel={m.action_save()}
          onSave={({ name: nextName }) =>
            rename.mutateAsync({ name: nextName }).then(() => setIsOpen(false))
          }
        />
      </DialogContent>
    </Dialog>
  );
}
