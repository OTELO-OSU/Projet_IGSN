import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
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
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { AttachmentDropZone } from "#/samples/attachment-drop-zone.tsx";
import { useDeleteAttachment } from "#/samples/use-delete-attachment.ts";
import { useDownloadAttachment } from "#/samples/use-download-attachment.ts";
import { useUpdateAttachmentDescription } from "#/samples/use-update-attachment-description.ts";
import { useUploadAttachments } from "#/samples/use-upload-attachments.ts";

type SampleAttachmentsProps = {
  sampleId: string;
  attachments: SampleAttachment[];
};

type AttachmentRowProps = {
  sampleId: string;
  attachment: SampleAttachment;
};

// One saved attachment: name, editable description (saved on blur), download
// and delete. Deleting removes the blob for good, hence the confirmation.
function AttachmentRow({ sampleId, attachment }: AttachmentRowProps) {
  const [description, setDescription] = useState(attachment.description ?? "");
  const updateDescription = useUpdateAttachmentDescription(sampleId);
  const deleteAttachment = useDeleteAttachment(sampleId);
  const download = useDownloadAttachment(sampleId);

  return (
    <li className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm" title={attachment.name}>
        {attachment.name}
      </span>
      <Input
        className="flex-1"
        value={description}
        aria-label={m.attachment_description({ name: attachment.name })}
        onChange={(event) => setDescription(event.target.value)}
        onBlur={() => {
          const trimmed = description.trim() || null;
          if (trimmed !== attachment.description) {
            updateDescription.mutate({
              attachmentId: attachment.id,
              description: trimmed,
            });
          }
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={m.action_download_attachment({ name: attachment.name })}
        onClick={() => void download(attachment)}
      >
        <Download aria-hidden />
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={m.action_delete_attachment({ name: attachment.name })}
          >
            <Trash2 aria-hidden />
          </Button>
        </DialogTrigger>
        <DialogContent closeLabel={m.action_close()}>
          <DialogHeader>
            <DialogTitle>{m.attachment_delete_title()}</DialogTitle>
            <DialogDescription>
              {m.attachment_delete_warning()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton closeLabel={m.action_cancel()}>
            <DialogClose asChild>
              <Button
                variant="destructive"
                onClick={() => deleteAttachment.mutate(attachment.id)}
              >
                {m.action_confirm()}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

// The attached-files section of the Links tab: a multi-file drop zone, the
// in-flight uploads with their progress bars, then the saved attachments.
export function SampleAttachments({
  sampleId,
  attachments,
}: SampleAttachmentsProps) {
  const { uploads, upload } = useUploadAttachments(sampleId);

  return (
    <FormSection title={m.section_attachments()}>
      <AttachmentDropZone onFiles={(files) => void upload(files)} />
      {uploads.length > 0 ? (
        <ul className="grid gap-2">
          {uploads.map((pending) => (
            <li key={pending.key} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{pending.name}</span>
              <progress
                value={pending.progress}
                max={100}
                aria-label={m.attachment_uploading({ name: pending.name })}
                className="h-2 w-40"
              />
            </li>
          ))}
        </ul>
      ) : null}
      {attachments.length === 0 && uploads.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.attachments_empty()}</p>
      ) : (
        <ul className="grid gap-2">
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              sampleId={sampleId}
              attachment={attachment}
            />
          ))}
        </ul>
      )}
    </FormSection>
  );
}
