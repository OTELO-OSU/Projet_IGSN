import type { ComponentProps } from "react";

import { SearchIcon } from "lucide-react";

import { cn } from "#/lib/utils.ts";

import { Input } from "./input.tsx";

export function SearchInput({
  label,
  className,
  ...props
}: ComponentProps<typeof Input> & { label: string }) {
  return (
    <label className="flex-1">
      <span className="sr-only">{label}</span>
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
