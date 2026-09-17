import { useDebouncedValue } from "@tanstack/react-pacer";
import { useState } from "react";

const DEBOUNCE_MS = 300;

export const MIN_SEARCH_LENGTH = 2;

export function usePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [search] = useDebouncedValue(term, { wait: DEBOUNCE_MS });
  return { isOpen, setIsOpen, term, setTerm, search };
}
