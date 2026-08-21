import type { ReactNode } from "react";

import { canModerateUsers } from "@projet-igsn/domain/user/can-moderate-users";

import { RouteGuard } from "./route-guard.tsx";

export function UserModerationOnly({ children }: { children?: ReactNode }) {
  return <RouteGuard allow={canModerateUsers}>{children}</RouteGuard>;
}
