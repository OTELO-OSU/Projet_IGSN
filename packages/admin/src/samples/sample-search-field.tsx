import { Input } from "@projet-igsn/design-system/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useRef } from "react";

import { m } from "#/paraglide/messages.js";

const DEBOUNCE_MS = 300;

type SampleSearchFieldProps = {
  defaultValue?: string;
  onSearch: (value: string) => void;
};

// Uncontrolled: the input owns its value (seeded from the URL via defaultValue)
// so URL state is not mirrored into React state. Typing is debounced so the
// list query is not refetched on every keystroke.
export function SampleSearchField({
  defaultValue,
  onSearch,
}: SampleSearchFieldProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  return (
    <div role="search">
      <label>
        <span className="sr-only">{m.samples_search_label()}</span>
        <div className="relative">
          <Input
            type="search"
            defaultValue={defaultValue}
            placeholder={m.samples_search_placeholder()}
            className="pe-9"
            onChange={(event) => {
              const { value } = event.target;
              clearTimeout(timer.current);
              timer.current = setTimeout(() => onSearch(value), DEBOUNCE_MS);
            }}
          />
          <SearchIcon
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2"
          />
        </div>
      </label>
    </div>
  );
}
