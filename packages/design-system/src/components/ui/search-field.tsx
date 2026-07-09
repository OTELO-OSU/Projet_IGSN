import { SearchIcon } from "lucide-react";
import { useRef } from "react";

import { Input } from "./input.tsx";

type SearchFieldProps = {
  defaultValue?: string;
  label: string;
  placeholder: string;
  onSearch: (value: string) => void;
};

// Debounce so a fast typist does not fire one query per keystroke; only the
// settled term is reported.
const DEBOUNCE_MS = 300;

// Uncontrolled: the caller (usually the URL) is the source of truth, the input
// just seeds from defaultValue, so there is no prop-into-state mirroring.
export function SearchField({
  defaultValue,
  label,
  placeholder,
  onSearch,
}: SearchFieldProps) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <div role="search">
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
