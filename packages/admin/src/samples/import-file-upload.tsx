import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";
import type { UseMutationResult } from "@tanstack/react-query";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DialogClose,
  DialogFooter,
} from "@projet-igsn/design-system/components/ui/dialog";
import {
  IMPORT_MAX_BYTES,
  type ImportSamples,
  importSamplesSchema,
} from "@projet-igsn/domain/sample/import/import-validator";
import { CircleXIcon, UploadIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { FileDropZone } from "#/samples/file-drop-zone.tsx";
import { ImportReport } from "#/samples/import-report.tsx";

export type ImportUpload = UseMutationResult<
  { issues: ImportIssue[]; count: number },
  Error,
  ImportSamples
>;

const fileError = (file: File | null): string | null => {
  if (!file) return null;
  const parsed = importSamplesSchema.safeParse({ file });
  if (parsed.success) return null;
  return parsed.error.issues.some((issue) => issue.code === "too_big")
    ? m.import_samples_file_too_large({ max: IMPORT_MAX_BYTES / 1024 / 1024 })
    : m.import_samples_file_not_xlsx();
};

export function ImportFileUpload({
  upload,
  onImported,
}: {
  upload: ImportUpload;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const error = fileError(file);

  function pick(picked: File | null) {
    setFile(picked);
    upload.reset();
  }

  return (
    <>
      <FileDropZone
        hint={m.import_samples_drop_hint()}
        browseLabel={m.import_samples_choose_file()}
        accept=".xlsx"
        isInline
        onFiles={([picked]) => pick(picked ?? null)}
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
      {upload.data?.issues.length ? (
        <ImportReport issues={upload.data.issues} />
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
          disabled={!file || error !== null || upload.isPending}
          onClick={() => {
            if (!file) return;
            upload.mutate(
              { file },
              {
                onSuccess: ({ issues }) => {
                  if (issues.length === 0) onImported();
                },
              },
            );
          }}
        >
          <UploadIcon aria-hidden />
          {m.action_import()}
        </Button>
      </DialogFooter>
    </>
  );
}
