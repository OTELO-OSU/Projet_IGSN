import type { Sample } from "@projet-igsn/domain/sample/sample";

import { Button } from "@projet-igsn/design-system/components/ui/button";

import { SampleList } from "#/domain/samples/sample-list.tsx";
import { m } from "#/paraglide/messages.js";

// Shared results block for both search engines: count, list and pagination.
// `emptyMessage`, when given, replaces the list on zero matches (the location
// engine wants its own copy; the text engine keeps the "0 results" count).
export function SearchResultsView({
  samples,
  total,
  query,
  page,
  pageCount,
  emptyMessage,
  onPageChange,
}: {
  samples: Sample[];
  total: number;
  query?: string;
  page: number;
  pageCount: number;
  emptyMessage?: string;
  onPageChange: (page: number) => void;
}) {
  if (total === 0 && emptyMessage) {
    return <p className="text-muted-foreground text-center">{emptyMessage}</p>;
  }

  return (
    <>
      <p className="text-muted-foreground mb-6">
        {m.search_results_count({ count: total })}
      </p>
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
    </>
  );
}
