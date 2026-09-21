import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { fullName } from "@projet-igsn/domain/user/full-name";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { SearchPicker } from "#/search-picker/search-picker.tsx";
import { usePicker } from "#/search-picker/use-picker.ts";
import { useSearchUsers } from "#/users/use-search-users.ts";

export function ContactNamePicker({
  id,
  userId,
  onChange,
  onFreeText,
}: {
  id: string;
  userId: string | null | undefined;
  onChange: (user: UserIdentity | null) => void;
  onFreeText: () => void;
}) {
  const picker = usePicker();
  const found = useSearchUsers(picker.search, undefined, {
    enabled: picker.isOpen,
    includeSelf: true,
  });
  const [picked, setPicked] = useState<UserIdentity | null>(null);
  const named = useSearchUsers("", undefined, {
    ids: userId == null ? undefined : [userId],
    enabled: userId != null && picked?.id !== userId,
  });
  const value = picked?.id === userId ? picked : (named.data?.[0] ?? null);

  return (
    <SearchPicker
      id={id}
      value={value}
      picker={picker}
      found={found}
      onChange={(user) => {
        setPicked(user);
        onChange(user);
      }}
      labelOf={fullName}
      detailOf={(user) => user.email}
      placeholder={m.contact_name_placeholder()}
      searchPlaceholder={m.contact_name_search_placeholder()}
      suggestionsLabel={m.contact_name_suggestions_label()}
      emptyText={m.contact_name_empty()}
      freeTextLabel={m.contact_name_free_text_action()}
      onFreeText={onFreeText}
    />
  );
}
