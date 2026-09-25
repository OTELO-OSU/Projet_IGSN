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
import {
  IMPORT_MAX_BYTES,
  importSamplesSchema,
} from "@projet-igsn/domain/sample/import/import-validator";
import { CircleXIcon, FileDownIcon, UploadIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { FileDropZone } from "#/samples/file-drop-zone.tsx";
import { useDownloadImportTemplate } from "#/samples/use-download-import-template.ts";
import { useImportSamples } from "#/samples/use-import-samples.ts";

const fileError = (file: File | null): string | null => {
  if (!file) return null;
  const parsed = importSamplesSchema.safeParse({ file });
  if (parsed.success) return null;
  return parsed.error.issues.some((issue) => issue.code === "too_big")
    ? m.import_samples_file_too_large({ max: IMPORT_MAX_BYTES / 1024 / 1024 })
    : m.import_samples_file_not_xlsx();
};

export function ImportSamplesDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const downloadTemplate = useDownloadImportTemplate();
  const importSamples = useImportSamples();
  const error = fileError(file);

  function close() {
    setIsOpen(false);
    setFile(null);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (open ? setIsOpen(true) : close())}
    >
      <DialogTrigger asChild>
        <Button variant="outline">{m.action_import()}</Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.import_samples_title()}</DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-4">
          <DialogDescription className="flex-1">
            {m.import_samples_description()}
          </DialogDescription>
          <Button
            type="button"
            variant="outline"
            disabled={downloadTemplate.isPending}
            onClick={() => downloadTemplate.mutate()}
          >
            <FileDownIcon aria-hidden />
            {m.action_download_template()}
          </Button>
        </div>
        <FileDropZone
          hint={m.import_samples_drop_hint()}
          browseLabel={m.import_samples_choose_file()}
          accept=".xlsx"
          isInline
          onFiles={([picked]) => setFile(picked ?? null)}
        />
        {file ? (
          <div className="grid gap-1 text-sm">
            <span className="truncate" title={file.name}>
              {file.name}
            </span>
            {error ? (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              <CircleXIcon aria-hidden />
              {m.action_cancel()}
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={!file || error !== null || importSamples.isPending}
            onClick={() => {
              if (file) importSamples.mutate({ file }, { onSuccess: close });
            }}
          >
            <UploadIcon aria-hidden />
            {m.action_import()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
