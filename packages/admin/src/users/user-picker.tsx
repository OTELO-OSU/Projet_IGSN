import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { fullName } from "@projet-igsn/domain/user/full-name";

import { m } from "#/paraglide/messages.js";
import { SearchPicker } from "#/search-picker/search-picker.tsx";
import {
  pickerState,
  usePickerSearch,
} from "#/search-picker/use-picker-search.ts";
import { useSearchUsers } from "#/users/use-search-users.ts";

export function UserPicker({
  onChange,
  sampleId,
  status,
  excludeMembersOf,
  ...picker
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
  const search = usePickerSearch();
  const found = useSearchUsers(search.search, sampleId, {
    enabled: search.isOpen,
    status,
    excludeMembersOf,
  });
  return (
    <SearchPicker
      {...picker}
      picker={pickerState(search, found, onChange)}
      labelOf={fullName}
      detailOf={(user) => user.email}
      searchPlaceholder={m.share_search_placeholder()}
      suggestionsLabel={m.share_suggestions_label()}
      emptyText={m.share_search_no_results()}
    />
  );
}
