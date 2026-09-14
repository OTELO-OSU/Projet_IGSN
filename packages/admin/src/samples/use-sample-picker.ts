import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useState } from "react";

import { useSearchEligibleParents } from "#/samples/use-search-eligible-parents.ts";
import { MIN_SEARCH_LENGTH } from "#/users/use-search-users.ts";

const DEBOUNCE_MS = 300;

export function useSamplePicker({
  onChange,
  exclude,
}: {
  onChange: (value: SampleParent | null) => void;
  exclude?: string;
}): {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  term: string;
  setTerm: (term: string) => void;
  samples: SampleParent[];
  hasNoResults: boolean;
  pick: (sample: SampleParent | null) => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [search] = useDebouncedValue(term, { wait: DEBOUNCE_MS });
  const found = useSearchEligibleParents(search, exclude, { enabled: isOpen });
  const samples = found.data ?? [];

  return {
    isOpen,
    setIsOpen,
    term,
    setTerm,
    samples,
    hasNoResults:
      search.length >= MIN_SEARCH_LENGTH &&
      !found.isFetching &&
      samples.length === 0,
    pick: (sample) => {
      onChange(sample);
      setIsOpen(false);
    },
  };
}
