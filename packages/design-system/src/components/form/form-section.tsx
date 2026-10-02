import { type ReactNode, useId } from "react";

const HEADINGS = {
  2: {
    Tag: "h2",
    className:
      "text-sm font-semibold tracking-wide text-muted-foreground uppercase",
    rowClassName: "mt-8 max-w-2xl border-b pb-1",
  },
  3: { Tag: "h3", className: "font-medium", rowClassName: "mt-4" },
} as const;

type FormSectionProps = {
  title: string;
  description?: ReactNode;
  level?: keyof typeof HEADINGS;
  action?: ReactNode;
  children?: ReactNode;
};

export function FormSection({
  title,
  description,
  level = 2,
  action,
  children,
}: FormSectionProps) {
  const titleId = useId();
  const descriptionId = useId();
  const { Tag, className, rowClassName } = HEADINGS[level];
  return (
    <section
      className="grid gap-4"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className={`flex items-center gap-2 ${rowClassName}`}>
        <Tag id={titleId} className={className}>
          {title}
        </Tag>
        {action}
      </div>
      {description && (
        <p
          id={descriptionId}
          className="text-muted-foreground max-w-2xl text-sm"
        >
          {description}
        </p>
      )}
      {children}
    </section>
  );
}
