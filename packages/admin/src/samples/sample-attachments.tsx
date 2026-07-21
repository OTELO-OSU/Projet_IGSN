import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Textarea } from "@projet-igsn/design-system/components/ui/textarea";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { Download, Trash2, Undo2 } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { AttachmentDropZone } from "#/samples/attachment-drop-zone.tsx";
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

type RowActionProps = {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

function RowAction({ icon: Icon, label, onClick, disabled }: RowActionProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
    >
      <Icon aria-hidden />
    </Button>
  );
}

type AttachmentRowLayoutProps = {
  name: string;
  // Rendered inside the name cell so staged and saved rows keep one layout.
  badge?: ReactNode;
  // Destructive note before the actions (marked for deletion, upload failed).
  status?: string;
  actions: ReactNode;
  isStruck?: boolean;
  // null hides the description block (a row marked for deletion).
  description: {
    id: string;
    value: string;
    onChange: (value: string) => void;
  } | null;
};

// One attachment row, staged or saved: truncated name, actions, description.
function AttachmentRowLayout({
  name,
  badge,
  status,
  actions,
  isStruck,
  description,
}: AttachmentRowLayoutProps) {
  return (
    <li className="grid gap-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm",
            isStruck && "line-through",
          )}
          title={name}
        >
          {name}
          {badge}
        </span>
        {status ? (
          <span className="text-destructive text-sm">{status}</span>
        ) : null}
        {actions}
      </div>
      {description ? (
        <div className="grid gap-2">
          <Label htmlFor={description.id}>{m.field_description()}</Label>
          <Textarea
            id={description.id}
            value={description.value}
            aria-label={m.attachment_description({ name })}
            onChange={(event) => description.onChange(event.target.value)}
          />
        </div>
      ) : null}
    </li>
  );
}

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
    <AttachmentRowLayout
      name={attachment.name}
      isStruck={isMarkedForDeletion}
      status={
        isMarkedForDeletion ? m.attachment_marked_for_deletion() : undefined
      }
      actions={
        isMarkedForDeletion ? (
          <RowAction
            icon={Undo2}
            label={m.action_restore_attachment({ name: attachment.name })}
            onClick={() => changes.restore(attachment.id)}
          />
        ) : (
          <>
            <RowAction
              icon={Download}
              label={m.action_download_attachment({ name: attachment.name })}
              onClick={() => void download(attachment)}
            />
            <RowAction
              icon={Trash2}
              label={m.action_delete_attachment({ name: attachment.name })}
              onClick={() => changes.markDelete(attachment.id)}
            />
          </>
        )
      }
      description={
        isMarkedForDeletion
          ? null
          : {
              id: `attachment-description-${attachment.id}`,
              value:
                changes.descriptions[attachment.id] ??
                attachment.description ??
                "",
              onChange: (value) => changes.setDescription(attachment.id, value),
            }
      }
    />
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
      {pending.length > 0 ? (
        <ul className="grid gap-2">
          {pending.map((staged) => (
            <AttachmentRowLayout
              key={staged.key}
              name={staged.file.name}
              badge={
                <Badge variant="secondary" className="ms-2">
                  {m.attachment_new_badge()}
                </Badge>
              }
              status={staged.error ? m.attachment_upload_failed() : undefined}
              actions={
                <>
                  {/* Disabled, not hidden: keeps the row aligned with saved
                      ones. The file is still on the user's disk. */}
                  <RowAction
                    icon={Download}
                    label={m.action_download_attachment({
                      name: staged.file.name,
                    })}
                    disabled
                  />
                  <RowAction
                    icon={Trash2}
                    label={m.action_remove_attachment({
                      name: staged.file.name,
                    })}
                    onClick={() => removeFile(staged.key)}
                  />
                </>
              }
              description={{
                id: `staged-description-${staged.key}`,
                value: staged.description ?? "",
                onChange: (value) => setPendingDescription(staged.key, value),
              }}
            />
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
