import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Textarea } from "@projet-igsn/design-system/components/ui/textarea";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { Download, Trash2, Undo2 } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { AttachmentDropZone } from "#/samples/attachment-drop-zone.tsx";
import { saveBlob } from "#/samples/save-blob.ts";
import { type SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import { useDownloadAttachment } from "#/samples/use-download-attachment.ts";

type SampleAttachmentsProps = {
  sampleId: string;
  attachments: SampleAttachment[];
  // Owned by the page (via useAttachmentChanges), not this component: the tab
  // content unmounts when hidden, and staged changes must survive tab
  // switches. Everything staged here only reaches the server on form submit.
  changes: SampleAttachmentChanges;
};

type AttachmentRowProps = {
  sampleId: string;
  attachment: SampleAttachment;
  changes: SampleAttachmentChanges;
};

// One saved attachment: name, editable description, download, delete. Edits
// and deletion are staged in `changes` (applied on submit), so delete is a
// reversible mark with a restore button, not an immediate call.
function AttachmentRow({ sampleId, attachment, changes }: AttachmentRowProps) {
  const download = useDownloadAttachment(sampleId);
  const isMarkedForDeletion = changes.deletions.includes(attachment.id);

  return (
    <li className="grid gap-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm",
            isMarkedForDeletion && "line-through",
          )}
          title={attachment.name}
        >
          {attachment.name}
        </span>
        {isMarkedForDeletion ? (
          <>
            <span className="text-destructive text-sm">
              {m.attachment_marked_for_deletion()}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={m.action_restore_attachment({
                name: attachment.name,
              })}
              onClick={() => changes.restore(attachment.id)}
            >
              <Undo2 aria-hidden />
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={m.action_download_attachment({
                name: attachment.name,
              })}
              onClick={() => void download(attachment)}
            >
              <Download aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={m.action_delete_attachment({ name: attachment.name })}
              onClick={() => changes.markDelete(attachment.id)}
            >
              <Trash2 aria-hidden />
            </Button>
          </>
        )}
      </div>
      {isMarkedForDeletion ? null : (
        <div className="grid gap-2">
          <Label htmlFor={`attachment-description-${attachment.id}`}>
            {m.field_description()}
          </Label>
          <Textarea
            id={`attachment-description-${attachment.id}`}
            value={
              changes.descriptions[attachment.id] ??
              attachment.description ??
              ""
            }
            aria-label={m.attachment_description({ name: attachment.name })}
            onChange={(event) =>
              changes.setDescription(attachment.id, event.target.value)
            }
          />
        </div>
      )}
    </li>
  );
}

// The attached-files section of the Links tab: a multi-file drop zone, the
// staged files awaiting the form submit (upload progress shows in
// SampleAttachmentUploadDialog), then the saved attachments.
export function SampleAttachments({
  sampleId,
  attachments,
  changes,
}: SampleAttachmentsProps) {
  const { pending, addFiles, removeFile, setPendingDescription } = changes;

  return (
    <FormSection title={m.section_attachments()}>
      <AttachmentDropZone onFiles={addFiles} />
      {/* Same layout as a saved row, so staged files read as attachments. */}
      {pending.length > 0 ? (
        <ul className="grid gap-2">
          {pending.map((staged) => (
            <li key={staged.key} className="grid gap-2">
              <div className="flex items-center gap-2">
                {/* The badge lives inside the name cell so the row keeps the
                    exact same layout as a saved attachment. */}
                <span
                  className="min-w-0 flex-1 truncate text-sm"
                  title={staged.file.name}
                >
                  {staged.file.name}
                  <Badge variant="secondary" className="ms-2">
                    {m.attachment_new_badge()}
                  </Badge>
                </span>
                {staged.error ? (
                  <span className="text-destructive text-sm">
                    {m.attachment_upload_failed()}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={m.action_download_attachment({
                    name: staged.file.name,
                  })}
                  onClick={() => saveBlob(staged.file, staged.file.name)}
                >
                  <Download aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={m.action_remove_attachment({
                    name: staged.file.name,
                  })}
                  onClick={() => removeFile(staged.key)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`staged-description-${staged.key}`}>
                  {m.field_description()}
                </Label>
                <Textarea
                  id={`staged-description-${staged.key}`}
                  value={staged.description ?? ""}
                  aria-label={m.attachment_description({
                    name: staged.file.name,
                  })}
                  onChange={(event) =>
                    setPendingDescription(staged.key, event.target.value)
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {attachments.length === 0 && pending.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.attachments_empty()}</p>
      ) : (
        <ul className="grid gap-2">
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              sampleId={sampleId}
              attachment={attachment}
              changes={changes}
            />
          ))}
        </ul>
      )}
    </FormSection>
  );
}
