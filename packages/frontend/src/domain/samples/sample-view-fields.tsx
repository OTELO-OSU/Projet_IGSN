import { ChevronRightIcon } from "lucide-react";

// A dot-joined classification path rendered as a breadcrumb: each ancestor
// label separated by a chevron. aria-labelledby names the list after its row
// label ("Type"/"Material"), and the chevron carries a ">" label so the path
// reads "Rock > Igneous" to assistive tech.
type BreadcrumbProps = {
  labelId: string;
  segments: { path: string; label: string }[];
};

export function ClassificationBreadcrumb({
  labelId,
  segments,
}: BreadcrumbProps) {
  return (
    <ol
      aria-labelledby={labelId}
      className="flex flex-wrap items-center gap-1 font-medium"
    >
      {segments.map((segment, index) => (
        <li key={segment.path} className="flex items-center gap-1">
          {index > 0 ? (
            <ChevronRightIcon
              role="img"
              aria-label=">"
              className="text-muted-foreground size-4"
            />
          ) : null}
          {segment.label}
        </li>
      ))}
    </ol>
  );
}

// A single "label: value" row.
export function Field({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt className="text-muted-foreground w-40">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
