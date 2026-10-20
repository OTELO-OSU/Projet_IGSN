import type { SearchExportFormat } from "@projet-igsn/domain/sample/search/search-export-validator";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { searchExportFormatSchema } from "@projet-igsn/domain/sample/search/search-export-validator";
import { DownloadIcon } from "lucide-react";

import { baseBrowserApiUrl } from "#/api.ts";
import { EXPORT_FORMAT_LABELS } from "#/domain/samples/export-format-labels.ts";
import { m } from "#/paraglide/messages.js";

function exportHref(igsn: string, format: SearchExportFormat): string {
  const href = new URL(`samples/${igsn}/export`, baseBrowserApiUrl);
  href.searchParams.set("format", format);
  return href.href;
}

export function DownloadSampleLink({ igsn }: { igsn: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary">
          <DownloadIcon aria-hidden="true" />
          {m.download_sample()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {searchExportFormatSchema.options.map((format) => (
          <DropdownMenuItem key={format} asChild>
            <a href={exportHref(igsn, format)} download>
              {EXPORT_FORMAT_LABELS[format]()}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
