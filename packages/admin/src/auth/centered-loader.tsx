import { LoaderCircleIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function CenteredLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div role="status">
        <LoaderCircleIcon
          aria-hidden
          className="text-muted-foreground size-10 animate-spin"
        />
        <span className="sr-only">{m.auth_loading()}</span>
      </div>
    </main>
  );
}
