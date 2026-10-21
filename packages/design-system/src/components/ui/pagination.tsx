import type { LucideIcon } from "lucide-react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { useId, useState } from "react";

import { Button } from "./button.tsx";
import { Input } from "./input.tsx";
import { Label } from "./label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip.tsx";

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

function PageInput({
  page,
  pageCount,
  label,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  label: string;
  onPageChange: (page: number) => void;
}) {
  const [draft, setDraft] = useState(String(page));
  const [shownPage, setShownPage] = useState(page);
  if (shownPage !== page) {
    setShownPage(page);
    setDraft(String(page));
  }

  const commit = () => {
    const typed = Number(draft);
    if (draft.trim() === "" || !Number.isInteger(typed)) {
      setDraft(String(page));
      return;
    }
    const next = Math.min(Math.max(typed, 1), pageCount);
    setDraft(String(next));
    if (next !== page) onPageChange(next);
  };

  return (
    <>
      <Input
        aria-label={label}
        inputMode="numeric"
        className="w-16 text-center"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
      />
      <span>/ {pageCount}</span>
    </>
  );
}

function PagerButton({
  label,
  Icon,
  isIconOnly,
  disabled,
  onClick,
}: {
  label: string;
  Icon: LucideIcon;
  isIconOnly: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  if (!isIconOnly)
    return (
      <Button variant="outline" disabled={disabled} onClick={onClick}>
        {label}
      </Button>
    );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// A fragment, so each caller keeps its own wrapper (a right-aligned toolbar in
// admin, a centered nav landmark in frontend).
export function Pager({
  page,
  pageCount,
  previousLabel,
  nextLabel,
  pageLabel,
  firstLabel,
  lastLabel,
  isIconOnly = false,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  previousLabel: string;
  nextLabel: string;
  pageLabel?: string;
  firstLabel?: string;
  lastLabel?: string;
  isIconOnly?: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      {firstLabel === undefined ? null : (
        <PagerButton
          label={firstLabel}
          Icon={ChevronsLeftIcon}
          isIconOnly={isIconOnly}
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        />
      )}
      <PagerButton
        label={previousLabel}
        Icon={ChevronLeftIcon}
        isIconOnly={isIconOnly}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      />
      {pageLabel === undefined ? (
        <span aria-live="polite">
          {page} / {pageCount}
        </span>
      ) : (
        <PageInput
          page={page}
          pageCount={pageCount}
          label={pageLabel}
          onPageChange={onPageChange}
        />
      )}
      <PagerButton
        label={nextLabel}
        Icon={ChevronRightIcon}
        isIconOnly={isIconOnly}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      />
      {lastLabel === undefined ? null : (
        <PagerButton
          label={lastLabel}
          Icon={ChevronsRightIcon}
          isIconOnly={isIconOnly}
          disabled={page >= pageCount}
          onClick={() => onPageChange(pageCount)}
        />
      )}
    </>
  );
}
