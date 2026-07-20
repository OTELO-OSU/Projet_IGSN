import { Button } from "@projet-igsn/design-system/components/ui/button";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { useRef, useState } from "react";

import { m } from "#/paraglide/messages.js";

type AttachmentDropZoneProps = {
  onFiles: (files: File[]) => void;
};

// Drop several files at once, or pick them through the (visually hidden but
// labelled) file input the Browse button drives — the keyboard and
// screen-reader path.
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
          // Reset so picking the same file again re-triggers the change.
          event.target.value = "";
        }}
      />
    </div>
  );
}
