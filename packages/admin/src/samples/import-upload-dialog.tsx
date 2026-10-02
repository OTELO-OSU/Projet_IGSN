import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@projet-igsn/design-system/components/ui/dialog";
import { useId } from "react";

import { m } from "#/paraglide/messages.js";
import {
  STAGED_UPLOAD_ATTEMPTS,
  type StagedUploadProgress,
} from "#/samples/upload-staged-documents.ts";
import { type ImportProgress } from "#/samples/use-import-samples.ts";

type ImportUploadDialogProps = {
  open: boolean;
  progress: ImportProgress;
};

const percentOf = (uploadedBytes: number, fileSize: number): number =>
  fileSize === 0 ? 100 : Math.round((uploadedBytes / fileSize) * 100);

function currentFileLine({
  fileIndex,
  fileCount,
  currentFileName,
  retryingAttempt,
}: StagedUploadProgress): string {
  const file = {
    number: fileIndex + 1,
    count: fileCount,
    name: currentFileName,
  };
  return retryingAttempt === undefined
    ? m.import_samples_upload_file(file)
    : m.import_samples_upload_file_retrying({
        ...file,
        attempt: retryingAttempt,
        total: STAGED_UPLOAD_ATTEMPTS,
      });
}

export function ImportUploadDialog({
  open,
  progress,
}: ImportUploadDialogProps) {
  const creatingId = useId();
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.import_samples_upload_title()}</DialogTitle>
          <DialogDescription>
            {m.import_samples_upload_description()}
          </DialogDescription>
        </DialogHeader>
        {progress === null || progress === "importing" ? (
          <div className="grid gap-2 text-sm">
            <span id={creatingId}>{m.import_samples_creating()}</span>
            <progress aria-labelledby={creatingId} className="h-2 w-full" />
            <p className="text-muted-foreground">
              {m.import_samples_creating_hint()}
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-2 text-sm">
            <p className="break-words">{currentFileLine(progress)}</p>
            <span className="flex items-center gap-2">
              <progress
                value={progress.uploadedBytes}
                max={progress.fileSize}
                aria-label={m.import_samples_upload_current_file()}
                className="h-2 min-w-0 flex-1"
              />
              <span className="w-10 shrink-0 text-right">
                {m.import_samples_upload_percent({
                  percent: percentOf(progress.uploadedBytes, progress.fileSize),
                })}
              </span>
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
