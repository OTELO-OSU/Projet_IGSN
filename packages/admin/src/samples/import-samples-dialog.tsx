import type { ImportDuplicate } from "@projet-igsn/domain/sample/import/import-report";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { ChevronDownIcon, FileDownIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { CustomizeTemplateDialog } from "#/samples/customize-template-dialog.tsx";
import { DuplicateSamplesDialog } from "#/samples/duplicate-samples-dialog.tsx";
import { ImportAttachmentList } from "#/samples/import-attachment-list.tsx";
import { ImportFileUpload } from "#/samples/import-file-upload.tsx";
import { ImportUploadDialog } from "#/samples/import-upload-dialog.tsx";
import { ReserveInternalIdsDialog } from "#/samples/reserve-internal-ids-dialog.tsx";
import { useCheckImportDuplicates } from "#/samples/use-check-import-duplicates.ts";
import { useDownloadImportTemplate } from "#/samples/use-download-import-template.ts";
import { useImportFiles } from "#/samples/use-import-files.ts";
import { useImportSamples } from "#/samples/use-import-samples.ts";

export function ImportSamplesDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const files = useImportFiles();
  const hasRequiredNames = files.requiredNames.length > 0;
  const downloadTemplate = useDownloadImportTemplate();
  const importSamples = useImportSamples();
  const checkDuplicates = useCheckImportDuplicates();
  const [suspects, setSuspects] = useState<{
    file: File;
    rows: ImportDuplicate[];
  } | null>(null);

  function close() {
    setIsOpen(false);
    setIsCustomizing(false);
    files.reset();
    importSamples.reset();
  }

  function runImport(file: File) {
    importSamples.mutate(
      { file, documents: files.documents },
      {
        onSuccess: ({ issues }) => {
          if (issues.length === 0) close();
        },
      },
    );
  }

  async function checkThenImport(file: File) {
    const rows = await checkDuplicates.mutateAsync(file).catch(() => null);
    if (rows === null) return;
    if (rows.length > 0) setSuspects({ file, rows });
    else runImport(file);
  }

  return (
    <>
      <Dialog
        open={isOpen && !isCustomizing && !suspects}
        onOpenChange={(open) => (open ? setIsOpen(true) : close())}
      >
        <DialogTrigger asChild>
          <Button variant="outline">{m.action_bulk_import()}</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl" closeLabel={m.action_close()}>
          <DialogHeader>
            <DialogTitle>{m.import_samples_title()}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <DialogDescription>
              {m.import_samples_description()}
            </DialogDescription>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={downloadTemplate.isPending}
                >
                  <FileDownIcon aria-hidden />
                  {m.action_download_template()}
                  <ChevronDownIcon aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => downloadTemplate.mutate(undefined)}
                >
                  {m.import_template_complete()}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsCustomizing(true)}>
                  {m.import_template_customized()}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ReserveInternalIdsDialog />
          </div>
          <ImportFileUpload
            dropZone={{
              hint: hasRequiredNames
                ? m.import_samples_documents_drop_hint()
                : m.import_samples_drop_hint(),
              browseLabel: hasRequiredNames
                ? m.import_samples_choose_documents()
                : m.import_samples_choose_file(),
              accept: hasRequiredNames ? undefined : ".xlsx",
              multiple: hasRequiredNames,
              onFiles: (picked) => {
                files.pickFiles(picked);
                importSamples.clearReport();
              },
            }}
            file={files.file}
            onRemove={() => {
              files.reset();
              importSamples.clearReport();
            }}
            issues={importSamples.data?.issues}
            isReady={files.isReady && !checkDuplicates.isPending}
            onImport={(file) => void checkThenImport(file)}
          >
            {hasRequiredNames ? (
              <ImportAttachmentList
                requiredNames={files.requiredNames}
                addedNames={files.addedNames}
                unreferencedNames={files.unreferencedNames}
                onRemove={files.removeDocument}
              />
            ) : null}
            {files.pickErrors.length > 0 ? (
              <div role="alert" className="text-destructive grid gap-1 text-sm">
                {files.pickErrors.map((pickError) => (
                  <p key={pickError}>{pickError}</p>
                ))}
              </div>
            ) : null}
          </ImportFileUpload>
        </DialogContent>
      </Dialog>
      <ImportUploadDialog
        open={importSamples.isPending}
        progress={importSamples.progress}
      />
      {suspects ? (
        <DuplicateSamplesDialog
          duplicates={[
            ...new Map(
              suspects.rows
                .flatMap(({ duplicates }) => duplicates)
                .map((duplicate) => [duplicate.id, duplicate]),
            ).values(),
          ]}
          note={m.import_samples_duplicates_note({
            rows: suspects.rows.map(({ row }) => row).join(", "),
          })}
          onConfirm={() => {
            setSuspects(null);
            runImport(suspects.file);
          }}
          onCancel={() => setSuspects(null)}
        />
      ) : null}
      <CustomizeTemplateDialog
        open={isOpen && isCustomizing}
        onBack={() => setIsCustomizing(false)}
      />
    </>
  );
}
