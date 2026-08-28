import type { ReactNode } from "react";

export function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className="rounded-md bg-sky-50 px-4 py-3 text-lg font-semibold text-sky-900"
    >
      {children}
    </h2>
  );
}
