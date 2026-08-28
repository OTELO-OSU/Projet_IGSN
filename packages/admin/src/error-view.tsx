import { m } from "#/paraglide/messages.js";

export function ErrorView({ error }: { error: Error }) {
  return (
    <div role="alert" className="flex flex-col gap-2 p-6">
      <h1 className="text-lg font-semibold">{m.app_error_title()}</h1>
      <p className="text-muted-foreground">{m.app_error_message()}</p>
      {import.meta.env.DEV && (
        <details className="text-sm">
          <summary>{error.message}</summary>
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
