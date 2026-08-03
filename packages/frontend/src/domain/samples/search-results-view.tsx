import type { Sample } from "@projet-igsn/domain/sample/sample";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@projet-igsn/design-system/components/ui/select";
import { PAGE_SIZES } from "@projet-igsn/domain/sample/sample-validator";

import { SampleList } from "#/domain/samples/sample-list.tsx";
import { m } from "#/paraglide/messages.js";

export function SearchResultsView({
  samples,
  total,
  query,
  page,
  pageCount,
  perPage,
  emptyMessage,
  onPageChange,
  onPerPageChange,
}: {
  samples: Sample[];
  total: number;
  query?: string;
  page: number;
  pageCount: number;
  perPage: number;
  emptyMessage: string;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) {
  if (total === 0) {
    return (
      <p role="status" className="text-muted-foreground text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-muted-foreground">
          {total === 1
            ? m.search_results_count_one()
            : m.search_results_count({ count: total })}
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="per-page">{m.search_per_page()}</Label>
          <Select
            value={String(perPage)}
            onValueChange={(value) => onPerPageChange(Number(value))}
          >
            <SelectTrigger id="per-page" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <SampleList samples={samples} query={query} />

      {pageCount > 1 ? (
        <nav
          aria-label={m.pagination_label()}
          className="mt-8 flex items-center justify-center gap-4"
        >
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            {m.pagination_previous()}
          </Button>
          <span aria-live="polite">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            {m.pagination_next()}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
