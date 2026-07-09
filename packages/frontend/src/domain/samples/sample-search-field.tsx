import { Input } from "@projet-igsn/design-system/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useRef } from "react";

type SampleSearchFieldProps = {
  defaultValue: string;
  label: string;
  placeholder: string;
  onSearch: (value: string) => void;
};

// Debounce so a fast typist does not fire one URL navigation (and Suspense
// refetch) per keystroke; only the settled term hits the query.
const DEBOUNCE_MS = 300;

export function SampleSearchField({
  defaultValue,
  label,
  placeholder,
  onSearch,
}: SampleSearchFieldProps) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <div role="search">
      {/* Uncontrolled: the URL is the source of truth, the input just seeds
          from it, so there is no prop-into-state mirroring to keep in sync. */}
      <label>
        <span className="sr-only">{label}</span>
        <div className="relative">
          <Input
            type="search"
            defaultValue={defaultValue}
            placeholder={placeholder}
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
