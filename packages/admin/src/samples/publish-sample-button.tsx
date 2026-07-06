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

import { m } from "#/paraglide/messages.js";

type PublishSampleButtonProps = {
  disabled?: boolean;
  onPublish: () => void;
};

// Publishing assigns a permanent IGSN and cannot be undone, hence the
// destructive styling and the confirmation dialog.
export function PublishSampleButton({
  disabled,
  onPublish,
}: PublishSampleButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={disabled}>
          {m.action_publish()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.publish_sample_title()}</DialogTitle>
          <DialogDescription>{m.publish_sample_warning()}</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton closeLabel={m.action_cancel()}>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onPublish}>
              {m.action_confirm()}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
