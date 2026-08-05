import { ChevronRightIcon } from "lucide-react";

import { FieldRow } from "#/domain/samples/field-rows.tsx";
import { pathBreadcrumb } from "#/domain/samples/path-breadcrumb.ts";

// aria-labelledby names the list after its row label ("Type"/"Material"), and
// the chevron carries a ">" label so the path reads "Rock > Igneous" to
// assistive tech.
type BreadcrumbProps = {
  labelId: string;
  segments: { path: string; label: string }[];
};

function ClassificationBreadcrumb({ labelId, segments }: BreadcrumbProps) {
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

type BreadcrumbFieldRowProps = {
  id: string;
  label: string;
  path: string | null | undefined;
  pathLabel: (path: string) => string;
};

export function BreadcrumbFieldRow({
  id,
  label,
  path,
  pathLabel,
}: BreadcrumbFieldRowProps) {
  return (
    <FieldRow
      id={id}
      label={label}
      value={
        path && (
          <ClassificationBreadcrumb
            labelId={id}
            segments={pathBreadcrumb(path, pathLabel)}
          />
        )
      }
    />
  );
}
