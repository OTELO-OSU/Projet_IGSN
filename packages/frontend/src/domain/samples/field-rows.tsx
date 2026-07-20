import type { ReactNode } from "react";

// The dl wrapper of a sample detail section; children are FieldRows.
export function FieldRows({ children }: { children: ReactNode }) {
  return <dl className="mt-2 divide-y">{children}</dl>;
}

type FieldRowProps = { label: string; value: ReactNode; id?: string };

// One dl row per field of a sample detail section. Renders nothing when the
// field has no value, so callers list every row unconditionally and pass the
// possibly-empty value through. `id` names the dt so a rich value (e.g. a
// classification breadcrumb) can point back to its label via aria-labelledby.
export function FieldRow({ id, label, value }: FieldRowProps) {
  // Explicit emptiness check, not !value: a numeric 0 is a real value.
  if (value == null || value === false || value === "") return null;
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt id={id} className="text-muted-foreground w-40">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
