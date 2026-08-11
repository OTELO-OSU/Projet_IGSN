import type { Sample } from "@projet-igsn/domain/sample/sample";

import {
  Pager,
  PageSizeSelect,
} from "@projet-igsn/design-system/components/ui/pagination";
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
        <PageSizeSelect
          perPage={perPage}
          pageSizes={PAGE_SIZES}
          label={m.search_per_page()}
          onPerPageChange={onPerPageChange}
        />
      </div>
      <SampleList samples={samples} query={query} />

      {pageCount > 1 ? (
        <nav
          aria-label={m.pagination_label()}
          className="mt-8 flex items-center justify-center gap-4"
        >
          <Pager
            page={page}
            pageCount={pageCount}
            previousLabel={m.pagination_previous()}
            nextLabel={m.pagination_next()}
            onPageChange={onPageChange}
          />
        </nav>
      ) : null}
    </div>
  );
}
