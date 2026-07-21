import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@projet-igsn/design-system/components/ui/dialog";

import { m } from "#/paraglide/messages.js";
import { type SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";

type SampleAttachmentUploadDialogProps = {
  changes: SampleAttachmentChanges;
};

// Opens on submit while staged files upload, one progress bar per file, then
// recaps what was uploaded and what failed. It cannot be dismissed while
// uploads run; once they settle, a confirm button closes it. After a failure
// the user can retry (submit again) or unstage the failed file.
export function SampleAttachmentUploadDialog({
  changes,
}: SampleAttachmentUploadDialogProps) {
  const isSettled = changes.batch.every((item) => item.status !== "uploading");

  return (
    <Dialog
      open={changes.isDialogOpen}
      onOpenChange={(open) => {
        // Uploads in flight: the dialog stays until they settle.
        if (!open && !isSettled) return;
        changes.setDialogOpen(open);
      }}
    >
      <DialogContent showCloseButton={false} closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.attachment_upload_dialog_title()}</DialogTitle>
          <DialogDescription>
            {m.attachment_upload_dialog_description()}
          </DialogDescription>
        </DialogHeader>
        {/* min-w-0 at every grid level: a grid child keeps its content width
            otherwise, letting long file names push the status past the dialog
            edge instead of ellipsizing. Hovering the name shows it in full. */}
        <ul className="grid min-w-0 gap-2">
          {changes.batch.map((item) => (
            <li
              key={item.key}
              className="flex min-w-0 items-center gap-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate" title={item.name}>
                {item.name}
              </span>
              {item.status === "uploading" ? (
                <progress
                  value={item.progress}
                  max={100}
                  aria-label={m.attachment_uploading({ name: item.name })}
                  className="h-2 w-40 shrink-0"
                />
              ) : item.status === "uploaded" ? (
                <span className="text-muted-foreground shrink-0">
                  {m.attachment_uploaded()}
                </span>
              ) : (
                <span className="text-destructive shrink-0">
                  {m.attachment_upload_failed()}
                </span>
              )}
            </li>
          ))}
        </ul>
        {isSettled ? (
          <DialogFooter closeLabel={m.action_close()}>
            <DialogClose asChild>
              <Button>{m.action_confirm()}</Button>
            </DialogClose>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
