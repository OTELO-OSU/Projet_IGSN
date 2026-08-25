import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useState } from "react";

import { MIN_SEARCH_LENGTH, useSearchUsers } from "#/users/use-search-users.ts";

const DEBOUNCE_MS = 300;

export function useUserPicker({
  onChange,
  sampleId,
  status,
  excludeMembersOf,
}: {
  onChange: (value: UserIdentity | null) => void;
  sampleId?: string;
  status?: UserStatus;
  excludeMembersOf?: string;
}): {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  term: string;
  setTerm: (term: string) => void;
  users: UserIdentity[];
  hasNoResults: boolean;
  pick: (user: UserIdentity | null) => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [search] = useDebouncedValue(term, { wait: DEBOUNCE_MS });
  const found = useSearchUsers(search, sampleId, {
    enabled: isOpen,
    status,
    excludeMembersOf,
  });
  const users = found.data ?? [];

  return {
    isOpen,
    setIsOpen,
    term,
    setTerm,
    users,
    hasNoResults:
      search.length >= MIN_SEARCH_LENGTH &&
      !found.isFetching &&
      users.length === 0,
    pick: (user) => {
      onChange(user);
      setIsOpen(false);
    },
  };
}
