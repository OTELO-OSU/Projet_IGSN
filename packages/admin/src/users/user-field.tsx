import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { useFieldContext } from "@projet-igsn/design-system/components/form/form-hook-contexts";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@projet-igsn/design-system/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@projet-igsn/design-system/components/ui/popover";
import { fullName } from "@projet-igsn/domain/user/full-name";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { MIN_SEARCH_LENGTH, useSearchUsers } from "#/users/use-search-users.ts";

const DEBOUNCE_MS = 300;

export function UserField({
  id,
  sampleId,
  status,
  excludeMembersOf,
}: {
  id: string;
  sampleId?: string;
  status?: UserStatus;
  excludeMembersOf?: string;
}) {
  const field = useFieldContext<UserIdentity | null>();
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [search] = useDebouncedValue(term, { wait: DEBOUNCE_MS });
  const found = useSearchUsers(search, sampleId, {
    enabled: isOpen,
    status,
    excludeMembersOf,
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between font-normal"
        >
          {field.state.value ? (
            fullName(field.state.value)
          ) : (
            <span className="text-muted-foreground">
              {m.share_email_placeholder()}
            </span>
          )}
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
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
                onSelect={() => {
                  field.handleChange(user);
                  setIsOpen(false);
                }}
              >
                {fullName(user)}
                <span className="text-muted-foreground">{user.email}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
