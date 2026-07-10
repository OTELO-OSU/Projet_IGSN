import { SearchIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "./button.tsx";
import { Input } from "./input.tsx";

type SearchFieldProps = {
  defaultValue?: string;
  label: string;
  placeholder: string;
  // When set, a submit button with this label is rendered next to the input.
  buttonLabel?: string;
  // Fire onSearch as the user types (debounced). When false, onSearch fires
  // only on submit (Enter or the button).
  searchOnType?: boolean;
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
  buttonLabel,
  searchOnType = true,
  onSearch,
}: SearchFieldProps) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track emptiness so an empty query can neither submit nor enable the button.
  const [isEmpty, setIsEmpty] = useState((defaultValue ?? "").trim() === "");

  return (
    <form
      role="search"
      className="flex gap-2"
      onSubmit={(event) => {
        // Submit (button or Enter) reports the current term at once, flushing
        // any pending debounce. An empty query is never submitted.
        event.preventDefault();
        const value = inputRef.current?.value ?? "";
        if (value.trim() === "") {
          return;
        }
        clearTimeout(timer.current);
        onSearch(value);
      }}
    >
      <label className="flex-1">
        <span className="sr-only">{label}</span>
        <div className="relative">
          <Input
            ref={inputRef}
            type="search"
            defaultValue={defaultValue}
            placeholder={placeholder}
            // Solid background so text, placeholder and icon stay legible even
            // when the field sits on a colored hero. Hide the browser-native
            // search clear button (ugly beveled gradient on Chromium/Linux).
            className="bg-background ps-9 [&::-webkit-search-cancel-button]:appearance-none"
            onChange={(event) => {
              const { value } = event.target;
              setIsEmpty(value.trim() === "");
              if (searchOnType) {
                clearTimeout(timer.current);
                timer.current = setTimeout(() => onSearch(value), DEBOUNCE_MS);
              }
            }}
          />
          <SearchIcon
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
          />
        </div>
      </label>
      {buttonLabel ? (
        <Button type="submit" disabled={isEmpty}>
          {buttonLabel}
        </Button>
      ) : null}
    </form>
  );
}
