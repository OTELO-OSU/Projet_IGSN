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
  label: string;
  disabled?: boolean;
  onPublish: () => void;
};

// Publishing assigns a permanent IGSN and cannot be undone, hence the
// confirmation dialog. type="button" so opening the dialog never submits the
// surrounding form as a draft.
export function PublishSampleButton({
  label,
  disabled,
  onPublish,
}: PublishSampleButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled}>
          {label}
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
