import type { CurrentUser } from "@projet-igsn/domain/user/current-user";
import type { ReactNode } from "react";

import { Navigate } from "@tanstack/react-router";

import { useCurrentUser } from "./use-current-user.ts";

export function RouteGuard({
  allow,
  children,
}: {
  allow: (me: CurrentUser) => boolean;
  children?: ReactNode;
}) {
  const { data: me, isPending } = useCurrentUser();

  if (isPending) return null;
  if (!me || !allow(me)) return <Navigate to="/" replace />;

  return children;
}
