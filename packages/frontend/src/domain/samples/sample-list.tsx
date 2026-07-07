import type { Sample } from "@projet-igsn/domain/sample/sample";

import { Link } from "@tanstack/react-router";

type SampleListItem = Pick<Sample, "igsn" | "name">;

export function SampleList({ samples }: { samples: SampleListItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {samples.map(({ igsn, name }) =>
        // The public list only carries published samples, which always have an
        // igsn; skip any that somehow don't rather than link to a broken page.
        igsn === null ? null : (
          <li key={igsn}>
            <Link
              to="/samples/$igsn"
              params={{ igsn }}
              className="block rounded-lg border p-4 hover:border-sky-800 hover:bg-sky-50"
            >
              <h2 className="font-semibold text-sky-900">{name}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{igsn}</p>
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}
