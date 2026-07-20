import type { ReactNode } from "react";

// One dl row per field of a sample detail section. `id` names the dt so a
// rich value (e.g. a classification breadcrumb) can point back to its label
// via aria-labelledby.
export type FieldRow = { label: string; value: ReactNode; id?: string };

export function FieldRows({ rows }: { rows: FieldRow[] }) {
  return (
    <dl className="mt-2 divide-y">
      {rows.map(({ id, label, value }) => (
        <div key={label} className="flex gap-4 px-4 py-3">
          <dt id={id} className="text-muted-foreground w-40">
            {label}
          </dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
