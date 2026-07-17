import { type ReactNode } from "react";

type FormSectionProps = {
  title: string;
  children: ReactNode;
};

// A titled group of form fields, so every form section shares one layout.
export function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
