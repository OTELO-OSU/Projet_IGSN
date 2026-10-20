import { Button } from "@projet-igsn/design-system/components/ui/button";
import { ATTACHMENT_MAX_BYTES } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { CheckIcon, CircleDashedIcon, XIcon } from "lucide-react";
import { useId } from "react";

import { m } from "#/paraglide/messages.js";
import { FileDropZone } from "#/samples/file-drop-zone.tsx";

type ImportAttachmentListProps = {
  requiredNames: readonly string[];
  addedNames: ReadonlySet<string>;
  unreferencedNames: readonly string[];
  onAdd: (files: File[]) => void;
  onRemove: (name: string) => void;
};

export function ImportAttachmentList({
  requiredNames,
  addedNames,
  unreferencedNames,
  onAdd,
  onRemove,
}: ImportAttachmentListProps) {
  const titleId = useId();
  return (
    <section className="grid gap-2 text-sm">
      <h3 id={titleId} className="font-medium">
        {m.import_samples_attachments_title()}
      </h3>
      <p className="text-muted-foreground">
        {m.import_samples_attachments_hint()}
      </p>
      <FileDropZone
        hint={m.import_samples_documents_drop_hint()}
        sizeHint={m.attachment_size_hint({
          max: ATTACHMENT_MAX_BYTES / 1024 / 1024,
        })}
        browseLabel={m.import_samples_choose_documents()}
        multiple
        isInline
        onFiles={onAdd}
      />
      <ul aria-labelledby={titleId} className="grid gap-1">
        {[...requiredNames, ...unreferencedNames].map((name) => (
          <li key={name} className="flex items-center justify-between gap-2">
            <span className="truncate" title={name}>
              {name}
            </span>
            {unreferencedNames.includes(name) ? (
              <span className="text-destructive flex items-center gap-1">
                {m.import_samples_attachment_not_referenced()}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={m.import_samples_attachment_remove({ name })}
                  onClick={() => onRemove(name)}
                >
                  <XIcon aria-hidden />
                </Button>
              </span>
            ) : addedNames.has(name) ? (
              <span className="flex items-center gap-1">
                <CheckIcon aria-hidden className="size-4" />
                {m.import_samples_attachment_added()}
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1">
                <CircleDashedIcon aria-hidden className="size-4" />
                {m.import_samples_attachment_missing()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
