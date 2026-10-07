import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { signIn } from "@projet-igsn/domain/auth/sign-in";
import { useAuth } from "react-oidc-context";

import { ADMIN_URL } from "#/admin-url.ts";

export function AccountCta({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "link";
  className?: string;
}) {
  const auth = useAuth();

  if (auth.isAuthenticated) {
    return (
      <Button asChild variant={variant} className={className}>
        <a href={ADMIN_URL}>{children}</a>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={() => signIn(auth)}
    >
      {children}
    </Button>
  );
}
