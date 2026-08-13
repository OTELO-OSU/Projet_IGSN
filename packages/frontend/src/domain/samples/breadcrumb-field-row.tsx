import { ChevronRightIcon } from "lucide-react";

import { ancestorPaths } from "#/domain/samples/ancestor-paths.ts";
import { FieldRow } from "#/domain/samples/field-rows.tsx";

type BreadcrumbProps = {
  labelId: string;
  segments: string[];
  pathLabel: (path: string) => string;
};

function ClassificationBreadcrumb({
  labelId,
  segments,
  pathLabel,
}: BreadcrumbProps) {
  return (
    <ol
      aria-labelledby={labelId}
      className="flex flex-wrap items-center gap-1 font-medium"
    >
      {segments.map((segment, index) => (
        <li key={segment} className="flex items-center gap-1">
          {index > 0 ? (
            <ChevronRightIcon
              role="img"
              aria-label=">"
              className="text-muted-foreground size-4"
            />
          ) : null}
          {pathLabel(segment)}
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
            segments={ancestorPaths(path)}
            pathLabel={pathLabel}
          />
        )
      }
    />
  );
}
