import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import { type SortingState } from "@tanstack/react-table";

import { Pagination } from "#/pagination/pagination.tsx";
import { m } from "#/paraglide/messages.js";
import { SampleTable } from "#/samples/sample-table.tsx";
import { useSamples } from "#/samples/use-samples.ts";

type SampleListParams = Pick<
  ListSamplesQuery,
  "page" | "perPage" | "sort" | "order" | "search" | "ownership"
>;

type SampleListPanelProps = {
  params: SampleListParams;
  update: (next: Partial<SampleListParams>) => void;
  moderated?: boolean;
};

export function SampleListPanel({
  params,
  update,
  moderated = false,
}: SampleListPanelProps) {
  const { page, perPage, sort, order } = params;
  const query = useSamples(params, moderated);
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / perPage));

  const sorting: SortingState = sort
    ? [{ id: sort, desc: order === "desc" }]
    : [];

  return (
    <>
      {query.isPending ? (
        <p>{m.samples_loading()}</p>
      ) : query.isError ? (
        <p role="alert">{m.samples_error()}</p>
      ) : (
        <SampleTable
          samples={query.data.data}
          withOwnerStatus={moderated}
          sorting={sorting}
          onSortingChange={(updater) => {
            const next =
              typeof updater === "function" ? updater(sorting) : updater;
            update({
              page: 1,
              sort: next[0] ? "status" : undefined,
              order: next[0]?.desc ? "desc" : "asc",
            });
          }}
        />
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        perPage={perPage}
        onPageChange={(nextPage) => update({ page: nextPage })}
        onPerPageChange={(nextPerPage) =>
          update({ page: 1, perPage: nextPerPage })
        }
      />
    </>
  );
}
