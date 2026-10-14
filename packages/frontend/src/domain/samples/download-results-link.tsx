import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { DownloadIcon } from "lucide-react";

import { baseBrowserApiUrl } from "#/api.ts";
import {
  type SearchFilters,
  searchFilterParams,
} from "#/domain/samples/client/list-samples.ts";
import { m } from "#/paraglide/messages.js";
import { SEARCH_EXPORT_LIMIT } from "#/search-export-limit.ts";

export function DownloadResultsLink({
  filters,
  total,
}: {
  filters: SearchFilters;
  total: number;
}) {
  const label = (
    <>
      <DownloadIcon aria-hidden="true" />
      {m.download_results()}
    </>
  );

  if (total > SEARCH_EXPORT_LIMIT) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button type="button" variant="ghost" disabled>
                {label}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {m.download_results_too_many({ max: SEARCH_EXPORT_LIMIT })}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const href = new URL("samples/export", baseBrowserApiUrl);
  href.search = searchFilterParams(filters).toString();
  return (
    <Button asChild variant="ghost">
      <a href={href.href} download>
        {label}
      </a>
    </Button>
  );
}
