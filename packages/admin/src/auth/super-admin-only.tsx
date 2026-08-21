import type { ReactNode } from "react";

import { RouteGuard } from "./route-guard.tsx";

export function SuperAdminOnly({ children }: { children?: ReactNode }) {
  return <RouteGuard allow={(me) => me.superAdmin}>{children}</RouteGuard>;
}
