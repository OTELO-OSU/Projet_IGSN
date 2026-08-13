import type { ReactNode } from "react";

import {
  Alert,
  AlertDescription,
} from "@projet-igsn/design-system/components/ui/alert";
import { TriangleAlertIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function CenteredScreen({
  message,
  isError = false,
  children,
}: {
  message: string;
  isError?: boolean;
  children?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{m.app_title()}</h1>
        {!isError && <p className="text-muted-foreground">{message}</p>}
      </div>
      {isError && (
        <Alert variant="destructive" className="max-w-md text-left">
          <TriangleAlertIcon />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {children}
    </main>
  );
}
