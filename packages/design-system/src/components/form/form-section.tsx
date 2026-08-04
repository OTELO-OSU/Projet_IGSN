import { type ReactNode, useId } from "react";

const HEADINGS = {
  2: { Tag: "h2", className: "text-lg font-semibold" },
  3: { Tag: "h3", className: "font-medium" },
} as const;

type FormSectionProps = {
  title: string;
  level?: keyof typeof HEADINGS;
  action?: ReactNode;
  children: ReactNode;
};

export function FormSection({
  title,
  level = 2,
  action,
  children,
}: FormSectionProps) {
  const titleId = useId();
  const { Tag, className } = HEADINGS[level];
  return (
    <section className="grid gap-4" aria-labelledby={titleId}>
      <div className="flex items-center gap-2">
        <Tag id={titleId} className={className}>
          {title}
        </Tag>
        {action}
      </div>
      {children}
    </section>
  );
}
