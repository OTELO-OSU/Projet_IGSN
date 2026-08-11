import type { ComponentProps } from "react";

import { SearchIcon } from "lucide-react";

import { Input } from "./input.tsx";

export function SearchInput({
  label,
  ...props
}: ComponentProps<typeof Input> & { label: string }) {
  return (
    <label className="flex-1">
      <span className="sr-only">{label}</span>
      <div className="relative">
        <Input
          type="search"
          // Hide the browser-native search clear button (ugly beveled gradient
          // on Chromium/Linux).
          className="bg-background ps-9 [&::-webkit-search-cancel-button]:appearance-none"
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
