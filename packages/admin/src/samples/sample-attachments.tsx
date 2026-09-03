import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { RelationTargetResourceType } from "@projet-igsn/domain/sample/relation/target-resource-type";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Combobox,
  toComboboxItems,
} from "@projet-igsn/design-system/components/ui/combobox";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Textarea } from "@projet-igsn/design-system/components/ui/textarea";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { RELATION_TARGET_RESOURCE_TYPES } from "@projet-igsn/domain/sample/relation/target-resource-type";
import { Download, Trash2, Undo2 } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { AttachmentDropZone } from "#/samples/attachment-drop-zone.tsx";
import { relationTargetResourceTypeLabel } from "#/samples/sample-labels.ts";
import {
  type AttachmentEdit,
  type SampleAttachmentChanges,
} from "#/samples/use-attachment-changes.ts";
import { useDownloadAttachment } from "#/samples/use-download-attachment.ts";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

const resourceTypeItems = toComboboxItems(
  RELATION_TARGET_RESOURCE_TYPES,
  relationTargetResourceTypeLabel,
);

type SampleAttachmentsProps = {
  sampleId: string;
  attachments: SampleAttachment[];
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
  index: number;
  name: string;
  badge?: ReactNode;
  status?: string;
  removeAction: ReactNode;
  downloadAction?: ReactNode;
  isStruck?: boolean;
  fields: {
    id: string;
    title: string;
    targetResourceType: string;
    description: string;
    onChange: (edit: AttachmentEdit) => void;
  } | null;
};

function AttachmentRowLayout({
  index,
  name,
  badge,
  status,
  removeAction,
  downloadAction,
  isStruck,
  fields,
}: AttachmentRowLayoutProps) {
  const isDisabled = useIsFieldDisabled("relations");
  return (
    <li>
      <fieldset className="grid gap-2 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">
          {m.legend_attachment({ index })}
        </legend>
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
          {downloadAction}
          {removeAction}
        </div>
        {fields ? (
          <div className="grid gap-2">
            <Label htmlFor={`${fields.id}-title`}>
              {m.attachment_title_label()}
            </Label>
            <Input
              id={`${fields.id}-title`}
              value={fields.title}
              disabled={isDisabled}
              onChange={(event) =>
                fields.onChange({ title: event.target.value })
              }
            />
            <Label htmlFor={`${fields.id}-resource-type`}>
              {m.attachment_resource_type_label()}
            </Label>
            <Combobox
              id={`${fields.id}-resource-type`}
              items={resourceTypeItems}
              value={fields.targetResourceType}
              disabled={isDisabled}
              placeholder={m.relation_resource_type_placeholder()}
              searchPlaceholder={m.relation_resource_type_search_placeholder()}
              emptyText={m.relation_resource_type_empty()}
              onChange={(value) =>
                fields.onChange({
                  targetResourceType: value as RelationTargetResourceType | "",
                })
              }
            />
            <Label htmlFor={`${fields.id}-description`}>
              {m.field_description()}
            </Label>
            <Textarea
              id={`${fields.id}-description`}
              value={fields.description}
              disabled={isDisabled}
              aria-label={m.attachment_description({ name })}
              onChange={(event) =>
                fields.onChange({ description: event.target.value })
              }
            />
          </div>
        ) : null}
      </fieldset>
    </li>
  );
}

type AttachmentRowProps = {
  index: number;
  sampleId: string;
  attachment: SampleAttachment;
  changes: SampleAttachmentChanges;
};

function AttachmentRow({
  index,
  sampleId,
  attachment,
  changes,
}: AttachmentRowProps) {
  const download = useDownloadAttachment(sampleId);
  const isMarkedForDeletion = changes.deletions.includes(attachment.id);
  const isDisabled = useIsFieldDisabled("relations");
  const edit = changes.edits[attachment.id] ?? {};

  return (
    <AttachmentRowLayout
      index={index}
      name={attachment.name}
      isStruck={isMarkedForDeletion}
      status={
        isMarkedForDeletion ? m.attachment_marked_for_deletion() : undefined
      }
      removeAction={
        isMarkedForDeletion ? (
          <RowAction
            icon={Undo2}
            label={m.action_restore_attachment({ name: attachment.name })}
            disabled={isDisabled}
            onClick={() => changes.restore(attachment.id)}
          />
        ) : (
          <RowAction
            icon={Trash2}
            label={m.action_delete_attachment({ name: attachment.name })}
            disabled={isDisabled}
            onClick={() => changes.markDelete(attachment.id)}
          />
        )
      }
      downloadAction={
        isMarkedForDeletion ? null : (
          <RowAction
            icon={Download}
            label={m.action_download_attachment({ name: attachment.name })}
            onClick={() => void download(attachment)}
          />
        )
      }
      fields={
        isMarkedForDeletion
          ? null
          : {
              id: `attachment-${attachment.id}`,
              title: edit.title ?? attachment.title ?? "",
              targetResourceType:
                edit.targetResourceType ?? attachment.targetResourceType ?? "",
              description: edit.description ?? attachment.description ?? "",
              onChange: (value) => changes.setEdit(attachment.id, value),
            }
      }
    />
  );
}

export function SampleAttachments({
  sampleId,
  attachments,
  changes,
}: SampleAttachmentsProps) {
  const { pending, addFiles, removeFile, setPendingEdit } = changes;
  const isDisabled = useIsFieldDisabled("relations");

  return (
    <FormSection title={m.section_attachments()}>
      {isDisabled ? null : <AttachmentDropZone onFiles={addFiles} />}
      <p
        className={cn(
          "text-sm",
          changes.keptCount > UPLOAD_LIMIT
            ? "text-destructive"
            : "text-muted-foreground",
        )}
      >
        {m.attachment_count({ count: changes.keptCount, limit: UPLOAD_LIMIT })}
      </p>
      {pending.length > 0 ? (
        <ul className="grid gap-2">
          {pending.map((staged, index) => (
            <AttachmentRowLayout
              key={staged.key}
              index={index + 1}
              name={staged.file.name}
              badge={
                <Badge variant="secondary" className="ms-2">
                  {m.attachment_new_badge()}
                </Badge>
              }
              status={staged.error ? m.attachment_upload_failed() : undefined}
              removeAction={
                <RowAction
                  icon={Trash2}
                  label={m.action_remove_attachment({
                    name: staged.file.name,
                  })}
                  disabled={isDisabled}
                  onClick={() => removeFile(staged.key)}
                />
              }
              downloadAction={
                <RowAction
                  icon={Download}
                  label={m.action_download_attachment({
                    name: staged.file.name,
                  })}
                  disabled
                />
              }
              fields={{
                id: `staged-${staged.key}`,
                title: staged.title ?? "",
                targetResourceType: staged.targetResourceType ?? "",
                description: staged.description ?? "",
                onChange: (value) => setPendingEdit(staged.key, value),
              }}
            />
          ))}
        </ul>
      ) : null}
      {attachments.length === 0 && pending.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.attachments_empty()}</p>
      ) : (
        <ul className="grid gap-2">
          {attachments.map((attachment, index) => (
            <AttachmentRow
              key={attachment.id}
              index={pending.length + index + 1}
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
