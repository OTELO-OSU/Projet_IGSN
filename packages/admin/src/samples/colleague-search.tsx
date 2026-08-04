import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@projet-igsn/design-system/components/ui/command";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { fullName } from "#/samples/full-name.ts";
import {
  MIN_SEARCH_LENGTH,
  useSearchUsers,
} from "#/samples/use-search-users.ts";

const DEBOUNCE_MS = 300;

export function ColleagueSearch({
  onPick,
}: {
  onPick: (userId: string) => void;
}) {
  const [term, setTerm] = useState("");
  const [search] = useDebouncedValue(term, { wait: DEBOUNCE_MS });
  const found = useSearchUsers(search);

  return (
    <Command shouldFilter={false} label={m.share_search_placeholder()}>
      <CommandInput
        placeholder={m.share_search_placeholder()}
        value={term}
        onValueChange={setTerm}
      />
      <CommandList label={m.share_suggestions_label()}>
        {search.length >= MIN_SEARCH_LENGTH && !found.isFetching ? (
          <CommandEmpty>{m.share_search_no_results()}</CommandEmpty>
        ) : null}
        {(found.data ?? []).map((user) => (
          <CommandItem
            key={user.id}
            value={user.id}
            onSelect={() => onPick(user.id)}
          >
            {fullName(user)}
            <span className="text-muted-foreground">{user.email}</span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}
