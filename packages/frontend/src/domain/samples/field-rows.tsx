import type { ReactNode } from "react";

export function FieldRows({ children }: { children: ReactNode }) {
  return <dl className="mt-2 divide-y">{children}</dl>;
}

type FieldRowProps = { label: string; value: ReactNode; id?: string };

export function FieldRow({ id, label, value }: FieldRowProps) {
  if (value == null || value === false || value === "") return null;
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt id={id} className="text-muted-foreground w-40">
        {label}
      </dt>
      <dd className="font-medium wrap-anywhere whitespace-pre-line">{value}</dd>
    </div>
  );
}
