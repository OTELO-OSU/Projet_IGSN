import {
  Pager,
  PageSizeSelect,
} from "@projet-igsn/design-system/components/ui/pagination";
import { PAGE_SIZES } from "@projet-igsn/domain/sample/sample-validator";

import { m } from "#/paraglide/messages.js";

type PaginationProps = {
  page: number;
  pageCount: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

export function Pagination({
  page,
  pageCount,
  perPage,
  onPageChange,
  onPerPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-end gap-4">
      <PageSizeSelect
        perPage={perPage}
        pageSizes={PAGE_SIZES}
        label={m.page_size_label()}
        hideLabel
        onPerPageChange={onPerPageChange}
      />

      <div className="flex items-center gap-2">
        <Pager
          page={page}
          pageCount={pageCount}
          previousLabel={m.pagination_previous()}
          nextLabel={m.pagination_next()}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
