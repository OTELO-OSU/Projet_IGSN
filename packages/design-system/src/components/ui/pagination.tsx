import { useId } from "react";

import { Button } from "./button.tsx";
import { Label } from "./label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select.tsx";

export function PageSizeSelect({
  perPage,
  pageSizes,
  label,
  hideLabel,
  onPerPageChange,
}: {
  perPage: number;
  pageSizes: readonly number[];
  label: string;
  hideLabel?: boolean;
  onPerPageChange: (perPage: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <Select
        value={String(perPage)}
        onValueChange={(value) => onPerPageChange(Number(value))}
      >
        <SelectTrigger id={id} className="w-32">
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
    </div>
  );
}

// A fragment, so each caller keeps its own wrapper (a right-aligned toolbar in
// admin, a centered nav landmark in frontend).
export function Pager({
  page,
  pageCount,
  previousLabel,
  nextLabel,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  previousLabel: string;
  nextLabel: string;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {previousLabel}
      </Button>
      <span aria-live="polite">
        {page} / {pageCount}
      </span>
      <Button
        variant="outline"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        {nextLabel}
      </Button>
    </>
  );
}
