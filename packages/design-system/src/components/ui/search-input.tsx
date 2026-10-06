import type { ComponentProps } from "react";

import { SearchIcon } from "lucide-react";

import { cn } from "#/lib/utils.ts";

import { Input } from "./input.tsx";

export function SearchInput({
  label,
  isLabelVisible = false,
  className,
  ...props
}: ComponentProps<typeof Input> & { label: string; isLabelVisible?: boolean }) {
  return (
    <label className={cn("flex-1", isLabelVisible && "grid gap-1.5")}>
      <span
        className={
          isLabelVisible ? "text-sm leading-none font-medium" : "sr-only"
        }
      >
        {label}
      </span>
      <div className="relative">
        <Input
          type="search"
          className={cn(
            "bg-background ps-9 [&::-webkit-search-cancel-button]:appearance-none",
            className,
          )}
          {...props}
        />
        <SearchIcon
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
        />
      </div>
    </label>
  );
}
