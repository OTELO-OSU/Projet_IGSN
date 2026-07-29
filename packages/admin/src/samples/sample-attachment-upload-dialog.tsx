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
import { cn } from "@projet-igsn/design-system/lib/utils";

import { m } from "#/paraglide/messages.js";
import { type UploadBatchItem } from "#/samples/upload-attachment.ts";
import { type SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";

type SampleAttachmentUploadDialogProps = {
  changes: SampleAttachmentChanges;
};

type SettledStatus = Exclude<UploadBatchItem["status"], "uploading">;

// Exhaustive, so a new upload state fails to compile until it is translated.
const UPLOAD_STATUSES: Record<SettledStatus, () => string> = {
  queued: () => m.attachment_upload_queued(),
  uploaded: () => m.attachment_uploaded(),
  failed: () => m.attachment_upload_failed(),
  rate_limited: () => m.attachment_upload_rate_limited(),
};

// A queued file is still on its way; the other two settled for good.
const isDeadEnd = (status: SettledStatus) =>
  status === "failed" || status === "rate_limited";

export function SampleAttachmentUploadDialog({
  changes,
}: SampleAttachmentUploadDialogProps) {
  const isSettled = changes.batch.every(
    (item) => item.status !== "uploading" && item.status !== "queued",
  );

  return (
    <Dialog
      open={changes.isDialogOpen}
      onOpenChange={(open) => {
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
        {/* The dialog cannot be dismissed and shows no footer while files are in
            flight, so each status change has to be announced: without it a queued
            file is indistinguishable from a hung one. */}
        <ul aria-live="polite" className="grid min-w-0 gap-2">
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
              ) : (
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-2",
                    isDeadEnd(item.status)
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {item.status === "queued" ? (
                    // No value: indeterminate reads as busy while the file waits
                    // out the server's window. The label beside it carries the
                    // meaning, so this stays out of the accessibility tree.
                    <progress max={100} aria-hidden className="h-2 w-16" />
                  ) : null}
                  {UPLOAD_STATUSES[item.status]()}
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
