import type { ExportSamplesRequest } from "@projet-igsn/domain/sample/export/export-validator";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { FileDownIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { useExportSamples } from "#/samples/use-export-samples.ts";

type ExportSamplesButtonProps = {
  exportRequest: ExportSamplesRequest | null;
  variant?: ComponentProps<typeof Button>["variant"];
  children: ReactNode;
};

export function ExportSamplesButton({
  exportRequest,
  variant,
  children,
}: ExportSamplesButtonProps) {
  const exportSamples = useExportSamples();
  const button = (
    <Button
      type="button"
      variant={variant}
      disabled={exportRequest === null || exportSamples.isPending}
      onClick={() => exportRequest && exportSamples.mutate(exportRequest)}
    >
      <FileDownIcon aria-hidden />
      {children}
    </Button>
  );
  if (exportRequest !== null) {
    return button;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="grid">
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{m.export_samples_unexportable()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
