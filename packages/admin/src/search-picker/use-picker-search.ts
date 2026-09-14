import { useDebouncedValue } from "@tanstack/react-pacer";
import { useState } from "react";

import { MIN_SEARCH_LENGTH } from "#/users/use-search-users.ts";

const DEBOUNCE_MS = 300;

export type PickerState<T> = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  term: string;
  setTerm: (term: string) => void;
  items: T[];
  hasNoResults: boolean;
  pick: (item: T | null) => void;
};

export function usePickerSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [search] = useDebouncedValue(term, { wait: DEBOUNCE_MS });
  return { isOpen, setIsOpen, term, setTerm, search };
}

export const pickerState = <T>(
  {
    isOpen,
    setIsOpen,
    term,
    setTerm,
    search,
  }: ReturnType<typeof usePickerSearch>,
  found: { data?: T[]; isFetching: boolean },
  onChange: (item: T | null) => void,
): PickerState<T> => {
  const items = found.data ?? [];
  return {
    isOpen,
    setIsOpen,
    term,
    setTerm,
    items,
    hasNoResults:
      search.length >= MIN_SEARCH_LENGTH &&
      !found.isFetching &&
      items.length === 0,
    pick: (item) => {
      onChange(item);
      setIsOpen(false);
    },
  };
};
