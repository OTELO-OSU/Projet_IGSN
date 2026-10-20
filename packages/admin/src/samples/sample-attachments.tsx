import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { RelationTargetResourceType } from "@projet-igsn/domain/sample/relation/target-resource-type";

import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import {
  FieldListAction,
  FieldListRemoveButton,
} from "@projet-igsn/design-system/components/form/field-list-item";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { RevealField } from "@projet-igsn/design-system/components/form/reveal-field";
import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import {
  Combobox,
  toComboboxItems,
} from "@projet-igsn/design-system/components/ui/combobox";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Textarea } from "@projet-igsn/design-system/components/ui/textarea";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { ATTACHMENT_MAX_BYTES } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { RELATION_TARGET_RESOURCE_TYPES } from "@projet-igsn/domain/sample/relation/target-resource-type";
import { Download, Undo2 } from "lucide-react";
import { type ReactNode, useId } from "react";

import type { SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";

import { m } from "#/paraglide/messages.js";
import {
  type AttachmentEdit,
  keptAttachmentMetadata,
} from "#/samples/attachment-metadata.ts";
import { FileDropZone } from "#/samples/file-drop-zone.tsx";
import { relationTargetResourceTypeLabel } from "#/samples/sample-labels.ts";
import { useDownloadAttachment } from "#/samples/use-download-attachment.ts";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

const COLUMN = "grid min-w-0 content-start gap-2 sm:w-72 sm:flex-none";

const resourceTypeItems = toComboboxItems(
  RELATION_TARGET_RESOURCE_TYPES,
  relationTargetResourceTypeLabel,
);

type SampleAttachmentsProps = {
  sampleId: string;
  attachments: SampleAttachment[];
  changes: SampleAttachmentChanges;
};

type AttachmentRowLayoutProps = {
  index: number;
  name: string;
  badge?: ReactNode;
  status?: string;
  actions: ReactNode;
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
  actions,
  isStruck,
  fields,
}: AttachmentRowLayoutProps) {
  const isDisabled = useIsFieldDisabled("relations");
  const id = useId();
  return (
    <div role="group" aria-labelledby={`${id}-legend`} className="grid gap-2">
      <div className="flex items-center gap-1">
        <span id={`${id}-legend`} className="font-medium">
          {m.legend_attachment({ index })}
        </span>
        {actions}
      </div>
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
      </div>
      {fields ? (
        <div className="grid gap-4 sm:flex sm:flex-wrap sm:items-start">
          <div className={COLUMN}>
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
          </div>
          <div className={COLUMN}>
            <Label htmlFor={`${fields.id}-resource-type`}>
              {withRequired(m.attachment_resource_type_label(), true)}
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
          </div>
          <RevealField
            label={m.reveal_attachment_description({ name })}
            isShown={fields.description !== ""}
            canReveal={fields.title !== ""}
            className="sm:h-9 sm:self-end"
          >
            <div className={COLUMN}>
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
          </RevealField>
        </div>
      ) : null}
    </div>
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
      actions={
        isMarkedForDeletion ? (
          <FieldListAction
            icon={Undo2}
            label={m.action_restore_attachment({ name: attachment.name })}
            disabled={isDisabled}
            onClick={() => changes.restore(attachment.id)}
          />
        ) : (
          <>
            <FieldListAction
              icon={Download}
              label={m.action_download_attachment({ name: attachment.name })}
              onClick={() => void download(attachment)}
            />
            <FieldListRemoveButton
              label={m.action_delete_attachment({ name: attachment.name })}
              disabled={isDisabled}
              onClick={() => changes.markDelete(attachment.id)}
            />
          </>
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
  const keptCount = keptAttachmentMetadata(attachments, changes).length;
  const isDisabled = useIsFieldDisabled("relations");

  return (
    <FormSection title={m.section_attachments()}>
      {isDisabled ? null : (
        <div className="max-w-2xl">
          <FileDropZone
            hint={m.attachment_drop_hint()}
            sizeHint={m.attachment_size_hint({
              max: ATTACHMENT_MAX_BYTES / 1024 / 1024,
            })}
            browseLabel={m.action_browse_files()}
            multiple
            onFiles={addFiles}
          />
        </div>
      )}
      <p
        className={cn(
          "text-sm",
          keptCount > UPLOAD_LIMIT
            ? "text-destructive"
            : "text-muted-foreground",
        )}
      >
        {m.attachment_count({ count: keptCount, limit: UPLOAD_LIMIT })}
      </p>
      {pending.length > 0 ? (
        <>
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
              actions={
                <>
                  <FieldListAction
                    icon={Download}
                    label={m.action_download_attachment({
                      name: staged.file.name,
                    })}
                    disabled
                  />
                  <FieldListRemoveButton
                    label={m.action_remove_attachment({
                      name: staged.file.name,
                    })}
                    disabled={isDisabled}
                    onClick={() => removeFile(staged.key)}
                  />
                </>
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
        </>
      ) : null}
      {attachments.length === 0 && pending.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.attachments_empty()}</p>
      ) : (
        <>
          {attachments.map((attachment, index) => (
            <AttachmentRow
              key={attachment.id}
              index={pending.length + index + 1}
              sampleId={sampleId}
              attachment={attachment}
              changes={changes}
            />
          ))}
        </>
      )}
    </FormSection>
  );
}
