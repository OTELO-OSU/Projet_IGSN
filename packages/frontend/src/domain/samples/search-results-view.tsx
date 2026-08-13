import type { Sample } from "@projet-igsn/domain/sample/sample";

import {
  Pager,
  PageSizeSelect,
} from "@projet-igsn/design-system/components/ui/pagination";
import { PAGE_SIZES } from "@projet-igsn/domain/sample/sample-validator";

import { CardFieldPicker } from "#/domain/samples/card-field-picker.tsx";
import { SampleList } from "#/domain/samples/sample-list.tsx";
import { m } from "#/paraglide/messages.js";

export function SearchResultsView({
  samples,
  total,
  query,
  page,
  pageCount,
  perPage,
  fields,
  emptyMessage,
  onPageChange,
  onPerPageChange,
  onFieldsChange,
}: {
  samples: Sample[];
  total: number;
  query?: string;
  page: number;
  pageCount: number;
  perPage: number;
  fields?: string[];
  emptyMessage: string;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onFieldsChange: (fields: string[]) => void;
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
        <div className="flex items-center gap-4">
          <PageSizeSelect
            perPage={perPage}
            pageSizes={PAGE_SIZES}
            label={m.search_per_page()}
            onPerPageChange={onPerPageChange}
          />
          <CardFieldPicker fields={fields} onFieldsChange={onFieldsChange} />
        </div>
      </div>
      <SampleList samples={samples} query={query} fields={fields} />

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
