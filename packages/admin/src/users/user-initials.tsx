import type { User } from "@projet-igsn/domain/user/model";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { fullName } from "@projet-igsn/domain/user/full-name";

const PILL_CLASS = [
  "bg-red-100 text-red-900",
  "bg-orange-100 text-orange-900",
  "bg-amber-100 text-amber-900",
  "bg-green-100 text-green-900",
  "bg-teal-100 text-teal-900",
  "bg-blue-100 text-blue-900",
  "bg-indigo-100 text-indigo-900",
  "bg-purple-100 text-purple-900",
];

// ponytail: eight hues, so two full names whose character sums agree modulo
// eight share a colour; key on the owner id if that starts to matter.
function pillClass(key: string): string {
  const sum = key
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  return PILL_CLASS[sum % PILL_CLASS.length]!;
}

export function UserInitials({
  name,
  firstname,
}: Pick<User, "name" | "firstname">) {
  const initials = [firstname, name]
    .map((part) => part?.trim().charAt(0).toUpperCase() ?? "")
    .join("");
  if (!initials) {
    return null;
  }

  const displayName = fullName({ firstname, name });
  return (
    <Badge
      variant="secondary"
      className={pillClass(displayName)}
      title={displayName}
    >
      <span aria-hidden>{initials}</span>
      <span className="sr-only">{displayName}</span>
    </Badge>
  );
}
