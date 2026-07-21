import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@projet-igsn/design-system/components/ui/dialog";

import { m } from "#/paraglide/messages.js";
import { type SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";

type SampleAttachmentUploadDialogProps = {
  changes: SampleAttachmentChanges;
};

// Opens on submit while staged files upload, one progress bar per file, then
// recaps what was uploaded and what failed until the user closes it. After a
// failure the user can retry (submit again) or unstage the failed file.
export function SampleAttachmentUploadDialog({
  changes,
}: SampleAttachmentUploadDialogProps) {
  return (
    <Dialog open={changes.isDialogOpen} onOpenChange={changes.setDialogOpen}>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.attachment_upload_dialog_title()}</DialogTitle>
          <DialogDescription>
            {m.attachment_upload_dialog_description()}
          </DialogDescription>
        </DialogHeader>
        <ul className="grid gap-2">
          {changes.batch.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {item.status === "uploading" ? (
                <progress
                  value={item.progress}
                  max={100}
                  aria-label={m.attachment_uploading({ name: item.name })}
                  className="h-2 w-40"
                />
              ) : item.status === "uploaded" ? (
                <span className="text-muted-foreground">
                  {m.attachment_uploaded()}
                </span>
              ) : (
                <span className="text-destructive">
                  {m.attachment_upload_failed()}
                </span>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
