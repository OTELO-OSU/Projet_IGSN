import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DialogClose,
  DialogFooter,
} from "@projet-igsn/design-system/components/ui/dialog";
import {
  IMPORT_MAX_BYTES,
  importSamplesSchema,
} from "@projet-igsn/domain/sample/import/import-validator";
import { CircleXIcon, UploadIcon, XIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { FileDropZone } from "#/samples/file-drop-zone.tsx";
import { ImportReport } from "#/samples/import-report.tsx";

const fileError = (file: File | null): string | null => {
  if (!file) return null;
  const parsed = importSamplesSchema.safeParse({ file });
  if (parsed.success) return null;
  return parsed.error.issues.some((issue) => issue.code === "too_big")
    ? m.import_samples_file_too_large({ max: IMPORT_MAX_BYTES / 1024 / 1024 })
    : m.import_samples_file_not_xlsx();
};

export function ImportFileUpload({
  dropZone,
  file,
  onRemove,
  issues,
  isReady,
  onImport,
  children,
}: {
  dropZone: Omit<ComponentProps<typeof FileDropZone>, "isInline">;
  file: File | null;
  onRemove: () => void;
  issues: ImportIssue[] | undefined;
  isReady: boolean;
  onImport: (file: File) => void;
  children?: ReactNode;
}) {
  const error = fileError(file);

  return (
    <>
      <FileDropZone {...dropZone} isInline />
      {file ? (
        <div className="grid gap-1 text-sm">
          <span className="flex items-center gap-1">
            <span className="truncate" title={file.name}>
              {file.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={m.import_samples_remove_workbook({ name: file.name })}
              onClick={onRemove}
            >
              <XIcon aria-hidden />
            </Button>
          </span>
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
      {issues?.length ? <ImportReport issues={issues} /> : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            <CircleXIcon aria-hidden />
            {m.action_cancel()}
          </Button>
        </DialogClose>
        <Button
          type="button"
          disabled={!file || error !== null || !isReady}
          onClick={() => file && onImport(file)}
        >
          <UploadIcon aria-hidden />
          {m.action_import()}
        </Button>
      </DialogFooter>
    </>
  );
}
