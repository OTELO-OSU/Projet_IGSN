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
      className="bg-primary/5 text-primary rounded-md px-4 py-3 text-lg font-semibold"
    >
      {children}
    </h2>
  );
}
