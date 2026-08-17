import { Button } from "@projet-igsn/design-system/components/ui/button";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { useRef, useState } from "react";

import { m } from "#/paraglide/messages.js";

type AttachmentDropZoneProps = {
  onFiles: (files: File[]) => void;
};

export function AttachmentDropZone({ onFiles }: AttachmentDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const pick = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        pick(event.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center gap-2 rounded-md border border-dashed p-6",
        isDragOver && "bg-muted border-primary",
      )}
    >
      <p className="text-muted-foreground text-sm">
        {m.attachment_drop_hint()}
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
      >
        {m.action_browse_files()}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        aria-label={m.action_browse_files()}
        tabIndex={-1}
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
