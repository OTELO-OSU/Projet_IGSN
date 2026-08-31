import { m } from "#/paraglide/messages.js";

export function ManagerCount({ count }: { count: number }) {
  if (count > 0) return <>{count}</>;

  return (
    <span className="text-destructive font-medium">
      0<span className="sr-only"> {m.manager_count_none()}</span>
    </span>
  );
}
