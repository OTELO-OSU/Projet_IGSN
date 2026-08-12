import type { ReactNode } from "react";

import { Navigate } from "@tanstack/react-router";

import { useCurrentUser } from "./use-current-user.ts";

export function SuperAdminOnly({ children }: { children?: ReactNode }) {
  const { data: me, isPending } = useCurrentUser();

  if (isPending) return null;
  if (!me?.superAdmin) return <Navigate to="/" replace />;

  return children;
}
