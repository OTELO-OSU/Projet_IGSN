import type { ExportSamplesRequest } from "@projet-igsn/domain/sample/export/export-validator";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { FileDownIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { ImportFileUpload } from "#/samples/import-file-upload.tsx";
import { useBulkEditSamples } from "#/samples/use-bulk-edit-samples.ts";
import { useExportSamples } from "#/samples/use-export-samples.ts";

export function BulkEditDialog({
  exportRequest,
}: {
  exportRequest: ExportSamplesRequest;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const exportSamples = useExportSamples();
  const bulkEdit = useBulkEditSamples();
  const [file, setFile] = useState<File | null>(null);

  function pick(picked: File | null) {
    setFile(picked);
    bulkEdit.reset();
  }

  function close() {
    setIsOpen(false);
    pick(null);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (open ? setIsOpen(true) : close())}
    >
      <DialogTrigger asChild>
        <Button variant="outline">{m.action_bulk_edit()}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl" closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.action_bulk_edit()}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <DialogDescription>{m.bulk_edit_description()}</DialogDescription>
          <Button
            type="button"
            variant="outline"
            disabled={exportSamples.isPending}
            onClick={() => exportSamples.mutate(exportRequest)}
          >
            <FileDownIcon aria-hidden />
            {m.action_export_samples()}
          </Button>
        </div>
        <ImportFileUpload
          dropZone={{
            hint: m.import_samples_drop_hint(),
            browseLabel: m.import_samples_choose_file(),
            accept: ".xlsx",
            onFiles: ([picked]) => pick(picked ?? null),
          }}
          file={file}
          onRemove={() => pick(null)}
          issues={bulkEdit.data?.issues}
          isReady={!bulkEdit.isPending}
          onImport={(picked) =>
            bulkEdit.mutate(
              { file: picked },
              {
                onSuccess: ({ issues }) => {
                  if (issues.length === 0) close();
                },
              },
            )
          }
        />
      </DialogContent>
    </Dialog>
  );
}
