import type { ExportSamplesRequest } from "@projet-igsn/domain/sample/export/export-validator";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { FileDownIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { useExportSamples } from "#/samples/use-export-samples.ts";

export function BulkEditDialog({
  exportRequest,
}: {
  exportRequest: ExportSamplesRequest;
}) {
  const exportSamples = useExportSamples();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{m.action_bulk_edit()}</Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.action_bulk_edit()}</DialogTitle>
          <DialogDescription>{m.bulk_edit_description()}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            disabled={exportSamples.isPending}
            onClick={() => exportSamples.mutate(exportRequest)}
          >
            <FileDownIcon aria-hidden />
            {m.action_export_samples()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
