import type { ExportSamplesRequest } from "@projet-igsn/domain/sample/export/export-validator";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { FileDownIcon, XIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { useExportSamples } from "#/samples/use-export-samples.ts";

type SampleBulkActionBarProps = {
  count: number;
  isAllSelected: boolean;
  exportRequest: ExportSamplesRequest;
  onSelectAll: () => void;
  onClear: () => void;
};

export function SampleBulkActionBar({
  count,
  isAllSelected,
  exportRequest,
  onSelectAll,
  onClear,
}: SampleBulkActionBarProps) {
  const exportSamples = useExportSamples();

  return (
    <section
      aria-label={m.samples_bulk_actions()}
      className="bg-background fixed inset-x-0 bottom-6 z-10 mx-auto flex w-fit items-center gap-3 rounded-md border px-4 py-2 shadow-lg"
    >
      <span className="text-sm">{m.samples_selected_count({ count })}</span>
      {isAllSelected ? null : (
        <Button type="button" variant="outline" onClick={onSelectAll}>
          {m.action_select_all()}
        </Button>
      )}
      <Button
        type="button"
        disabled={exportSamples.isPending}
        onClick={() => exportSamples.mutate(exportRequest)}
      >
        <FileDownIcon aria-hidden />
        {m.action_export()}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={m.action_clear_selection()}
        onClick={onClear}
      >
        <XIcon aria-hidden />
      </Button>
    </section>
  );
}
