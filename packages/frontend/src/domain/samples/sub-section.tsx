import { type ReactNode, useId } from "react";

export function SubSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="mt-4">
      <h3 id={id} className="text-primary px-4 pt-3 font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}
