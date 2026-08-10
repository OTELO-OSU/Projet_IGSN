import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { X } from "lucide-react";

import { m } from "#/paraglide/messages.js";

type RemoveContributorButtonProps = {
  name: string;
  onConfirm: () => void;
};

export function RemoveContributorButton({
  name,
  onConfirm,
}: RemoveContributorButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={m.share_contributor_remove({ name })}
        >
          <X aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.share_contributor_remove_title()}</DialogTitle>
          <DialogDescription>
            {m.share_contributor_remove_description({ name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter closeLabel={m.action_close()}>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {m.action_cancel()}
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="button" variant="destructive" onClick={onConfirm}>
              {m.action_confirm()}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
