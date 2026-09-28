import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Link } from "@tanstack/react-router";

import { m } from "#/paraglide/messages.js";

export function NotFoundNotice() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">{m.not_found_title()}</h1>
      <p className="text-muted-foreground mt-6">{m.not_found_notice()}</p>
      <div className="mt-8">
        <Button asChild variant="secondary">
          <Link to="/">{m.not_found_back()}</Link>
        </Button>
      </div>
    </div>
  );
}
