import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@projet-igsn/design-system/components/ui/alert";

import { m } from "#/paraglide/messages.js";

export function ErrorView({ error }: { error: Error }) {
  return (
    <Alert variant="destructive" className="mx-auto my-16 max-w-3xl">
      <AlertTitle>{m.error_title()}</AlertTitle>
      <AlertDescription>
        {m.error_message()}
        {import.meta.env.DEV && (
          <details>
            <summary>{error.message}</summary>
            <pre className="whitespace-pre-wrap">{error.stack}</pre>
          </details>
        )}
      </AlertDescription>
    </Alert>
  );
}
