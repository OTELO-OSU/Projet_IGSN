import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import {
  type SearchExportFormat,
  searchExportFormatSchema,
} from "@projet-igsn/domain/sample/search/search-export-validator";
import { DownloadIcon } from "lucide-react";

import { baseBrowserApiUrl } from "#/api.ts";
import {
  type SearchFilters,
  searchFilterParams,
} from "#/domain/samples/client/list-samples.ts";
import { EXPORT_FORMAT_LABELS } from "#/domain/samples/export-format-labels.ts";
import { useExportSelectedSamples } from "#/domain/samples/hook/export-selected-samples.ts";
import { m } from "#/paraglide/messages.js";
import {
  SEARCH_CSV_EXPORT_LIMIT,
  SEARCH_XLSX_EXPORT_LIMIT,
} from "#/search-export-limit.ts";

function exportHref(filters: SearchFilters, format: SearchExportFormat) {
  const href = new URL("samples/export", baseBrowserApiUrl);
  const params = searchFilterParams(filters);
  params.set("format", format);
  href.search = params.toString();
  return href.href;
}

function TooManyForExcelItem() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuItem
            aria-disabled="true"
            className="opacity-50"
            onSelect={(event) => event.preventDefault()}
          >
            {EXPORT_FORMAT_LABELS.xlsx()}
          </DropdownMenuItem>
        </TooltipTrigger>
        <TooltipContent side="left">
          {m.download_results_xlsx_too_many({ max: SEARCH_XLSX_EXPORT_LIMIT })}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DownloadResultsLink({
  filters,
  total,
  selected,
}: {
  filters: SearchFilters;
  total: number;
  selected: string[];
}) {
  const { mutate } = useExportSelectedSamples();
  const hasSelection = selected.length > 0;
  const label = (
    <>
      <DownloadIcon aria-hidden="true" />
      {hasSelection
        ? m.download_results_selected({ count: selected.length })
        : m.download_results()}
    </>
  );

  if (!hasSelection && total > SEARCH_CSV_EXPORT_LIMIT) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="phone:hidden">
              <Button type="button" variant="ghost" disabled>
                {label}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {m.download_results_csv_too_many({ max: SEARCH_CSV_EXPORT_LIMIT })}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isTooManyForExcel =
    (hasSelection ? selected.length : total) > SEARCH_XLSX_EXPORT_LIMIT;
  const item = (format: SearchExportFormat) => {
    if (format === "xlsx" && isTooManyForExcel) {
      return <TooManyForExcelItem key={format} />;
    }
    if (hasSelection) {
      return (
        <DropdownMenuItem
          key={format}
          onSelect={() => mutate({ format, igsns: selected })}
        >
          {EXPORT_FORMAT_LABELS[format]()}
        </DropdownMenuItem>
      );
    }
    return (
      <DropdownMenuItem key={format} asChild>
        <a href={exportHref(filters, format)} download>
          {EXPORT_FORMAT_LABELS[format]()}
        </a>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="phone:hidden">
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {searchExportFormatSchema.options.map(item)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
