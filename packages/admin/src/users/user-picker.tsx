import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { fullName } from "@projet-igsn/domain/user/full-name";

import { m } from "#/paraglide/messages.js";
import { SearchPicker } from "#/search-picker/search-picker.tsx";
import { usePicker } from "#/search-picker/use-picker.ts";
import { useSearchUsers } from "#/users/use-search-users.ts";

export function UserPicker({
  onChange,
  sampleId,
  status,
  excludeMembersOf,
  ...props
}: {
  id: string;
  value: UserIdentity | null;
  onChange: (value: UserIdentity | null) => void;
  placeholder: string;
  clearLabel?: string;
  sampleId?: string;
  status?: UserStatus;
  excludeMembersOf?: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}) {
  const picker = usePicker();
  const found = useSearchUsers(picker.search, sampleId, {
    enabled: picker.isOpen,
    status,
    excludeMembersOf,
  });
  return (
    <SearchPicker
      {...props}
      picker={picker}
      found={found}
      onChange={onChange}
      labelOf={fullName}
      detailOf={(user) => user.email}
      searchPlaceholder={m.share_search_placeholder()}
      suggestionsLabel={m.share_suggestions_label()}
      emptyText={m.share_search_no_results()}
    />
  );
}
