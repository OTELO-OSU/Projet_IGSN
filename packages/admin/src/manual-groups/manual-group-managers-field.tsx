import { useFieldContext } from "@projet-igsn/design-system/components/form/form-hook-contexts";
import { MultiComboboxField } from "@projet-igsn/design-system/components/form/multi-combobox-field";
import { fullName } from "@projet-igsn/domain/user/full-name";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { useSearchUsers } from "#/users/use-search-users.ts";

const DEBOUNCE_MS = 300;

export function ManualGroupManagersField() {
  const field = useFieldContext<string[]>();
  const [term, setTerm] = useState("");
  const [search] = useDebouncedValue(term, { wait: DEBOUNCE_MS });
  const found = useSearchUsers(search, undefined, {
    includeSelf: true,
    status: "accepted",
  });
  const picked = useSearchUsers("", undefined, {
    enabled: field.state.value.length > 0,
    ids: field.state.value,
  });

  const byId = new Map(
    [...(picked.data ?? []), ...(found.data ?? [])].map((user) => [
      user.id,
      user,
    ]),
  );

  return (
    <MultiComboboxField
      label={m.field_manual_group_managers()}
      items={[...byId.values()].map((user) => ({
        value: user.id,
        label: fullName(user) || user.email,
      }))}
      onSearch={setTerm}
      placeholder={m.manual_group_managers_placeholder()}
      searchPlaceholder={m.share_search_placeholder()}
      emptyText={m.manual_group_managers_empty()}
      removeLabel={(label) => m.managed_remove({ name: label })}
    />
  );
}
