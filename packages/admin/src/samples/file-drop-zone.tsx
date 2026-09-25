import { Button } from "@projet-igsn/design-system/components/ui/button";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { UploadIcon } from "lucide-react";
import { useRef, useState } from "react";

type FileDropZoneProps = {
  hint: string;
  browseLabel: string;
  accept?: string;
  multiple?: boolean;
  isInline?: boolean;
  onFiles: (files: File[]) => void;
};

export function FileDropZone({
  hint,
  browseLabel,
  accept,
  multiple,
  isInline,
  onFiles,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const pick = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const browse = (
    <Button
      type="button"
      variant={isInline ? "link" : "outline"}
      className={cn(isInline && "text-foreground h-auto p-0 underline")}
      onClick={() => inputRef.current?.click()}
    >
      {browseLabel}
    </Button>
  );

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
      {isInline ? (
        <>
          <UploadIcon aria-hidden className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">
            {hint} {browse}
          </p>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">{hint}</p>
          {browse}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        aria-label={browseLabel}
        tabIndex={-1}
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
