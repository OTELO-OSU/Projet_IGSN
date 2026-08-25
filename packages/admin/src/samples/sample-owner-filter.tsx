import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { useSearchUsers } from "#/users/use-search-users.ts";
import { UserPicker } from "#/users/user-picker.tsx";

export function SampleOwnerFilter({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const [picked, setPicked] = useState<UserIdentity | null>(null);
  const named = useSearchUsers("", undefined, {
    ids: value === undefined ? undefined : [value],
    enabled: value !== undefined && picked?.id !== value,
  });
  const owner =
    [picked, named.data?.[0]].find((user) => user?.id === value) ?? null;

  return (
    <UserPicker
      id={id}
      value={owner}
      onChange={(next) => {
        setPicked(next);
        onChange(next?.id);
      }}
      placeholder={m.filter_researcher_any()}
      clearLabel={m.filter_researcher_any()}
    />
  );
}
