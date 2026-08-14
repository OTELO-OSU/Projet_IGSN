import type { UserStatus } from "@projet-igsn/domain/user/model";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";

import { userStatusLabel } from "./user-status-label.ts";

const STATUS_CLASS: Record<UserStatus, string> = {
  pending: "",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge variant="secondary" className={STATUS_CLASS[status]}>
      {userStatusLabel(status)}
    </Badge>
  );
}
