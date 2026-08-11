import { useRef } from "react";

import { SearchInput } from "./search-input.tsx";

type SearchFieldProps = {
  defaultValue?: string;
  label: string;
  placeholder: string;
  onSearch: (value: string) => void;
};

const DEBOUNCE_MS = 300;

export function SearchField({
  defaultValue,
  label,
  placeholder,
  onSearch,
}: SearchFieldProps) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      role="search"
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = inputRef.current?.value ?? "";
        if (value.trim() === "") {
          return;
        }
        clearTimeout(timer.current);
        onSearch(value);
      }}
    >
      <SearchInput
        ref={inputRef}
        label={label}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={(event) => {
          const { value } = event.target;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onSearch(value), DEBOUNCE_MS);
        }}
      />
    </form>
  );
}
