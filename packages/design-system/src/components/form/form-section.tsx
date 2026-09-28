import { type ReactNode, useId } from "react";

const HEADINGS = {
  2: {
    Tag: "h2",
    className:
      "text-sm font-semibold tracking-wide text-muted-foreground uppercase",
    rowClassName: "mt-4 border-b pb-1",
  },
  3: { Tag: "h3", className: "font-medium", rowClassName: "" },
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
  const { Tag, className, rowClassName } = HEADINGS[level];
  return (
    <section className="grid gap-4" aria-labelledby={titleId}>
      <div className={`flex items-center gap-2 ${rowClassName}`}>
        <Tag id={titleId} className={className}>
          {title}
        </Tag>
        {action}
      </div>
      {children}
    </section>
  );
}
