import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { ComboboxTrigger } from "@projet-igsn/design-system/components/ui/combobox";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@projet-igsn/design-system/components/ui/command";
import {
  Popover,
  PopoverContent,
} from "@projet-igsn/design-system/components/ui/popover";
import { fullName } from "@projet-igsn/domain/user/full-name";

import { m } from "#/paraglide/messages.js";
import { useUserPicker } from "#/users/use-user-picker.ts";

export function UserPicker({
  id,
  value,
  onChange,
  placeholder,
  clearLabel,
  sampleId,
  status,
  excludeMembersOf,
}: {
  id: string;
  value: UserIdentity | null;
  onChange: (value: UserIdentity | null) => void;
  placeholder: string;
  clearLabel?: string;
  sampleId?: string;
  status?: UserStatus;
  excludeMembersOf?: string;
}) {
  const picker = useUserPicker({
    onChange,
    sampleId,
    status,
    excludeMembersOf,
  });

  return (
    <Popover open={picker.isOpen} onOpenChange={picker.setIsOpen}>
      <ComboboxTrigger id={id} open={picker.isOpen}>
        {value ? (
          fullName(value)
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </ComboboxTrigger>
      <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] min-w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false} label={m.share_search_placeholder()}>
          <CommandInput
            placeholder={m.share_search_placeholder()}
            value={picker.term}
            onValueChange={picker.setTerm}
          />
          <CommandList label={m.share_suggestions_label()}>
            {picker.hasNoResults ? (
              <div className="py-6 text-center text-sm">
                {m.share_search_no_results()}
              </div>
            ) : null}
            {clearLabel === undefined ? null : (
              <CommandItem value="any" onSelect={() => picker.pick(null)}>
                {clearLabel}
              </CommandItem>
            )}
            {picker.users.map((user) => (
              <CommandItem
                key={user.id}
                value={user.id}
                onSelect={() => picker.pick(user)}
              >
                <span className="truncate">{fullName(user)}</span>
                <span className="text-muted-foreground truncate">
                  {user.email}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
