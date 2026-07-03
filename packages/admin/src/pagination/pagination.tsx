import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@projet-igsn/design-system/components/ui/select";

import { m } from "#/paraglide/messages.js";

type PaginationProps = {
  page: number;
  pageCount: number;
  perPage: number;
  pageSizes: readonly number[];
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

export function Pagination({
  page,
  pageCount,
  perPage,
  pageSizes,
  onPageChange,
  onPerPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-end gap-4">
      <Select
        value={String(perPage)}
        onValueChange={(value) => onPerPageChange(Number(value))}
      >
        <SelectTrigger className="w-32" aria-label={m.page_size_label()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizes.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}
