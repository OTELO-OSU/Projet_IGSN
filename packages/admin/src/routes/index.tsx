import type { z } from "zod";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@projet-igsn/design-system/components/ui/select";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { Link, createFileRoute } from "@tanstack/react-router";
import { type SortingState } from "@tanstack/react-table";

import { Pagination } from "#/pagination/pagination.tsx";
import { m } from "#/paraglide/messages.js";
import { SampleTable } from "#/samples/sample-table.tsx";
import { useSamples } from "#/samples/use-samples.ts";

const searchSchema = listSamplesQuerySchema.pick({
  page: true,
  perPage: true,
  sort: true,
  order: true,
  search: true,
  ownership: true,
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: SampleListPage,
});

type SampleListSearch = z.infer<typeof searchSchema>;
type Ownership = NonNullable<SampleListSearch["ownership"]>;

const OWNERSHIP_LABEL: Record<Ownership, () => string> = {
  mine: () => m.samples_ownership_mine(),
  shared: () => m.samples_ownership_shared(),
};

const ALL_OWNERSHIPS = "all";

function SampleListPage() {
  const { page, perPage, sort, order, search, ownership } = Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useSamples({ page, perPage, sort, order, search, ownership });

  const update = (next: Partial<SampleListSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }) });

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const sorting: SortingState = sort
    ? [{ id: sort, desc: order === "desc" }]
    : [];

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{m.samples_title()}</h1>
        <Button asChild>
          <Link to="/samples/create">{m.action_create()}</Link>
        </Button>
      </div>

      <div className="flex items-end gap-4">
        <SearchField
          defaultValue={search}
          label={m.samples_search_label()}
          placeholder={m.samples_search_placeholder()}
          onSearch={(value) => update({ page: 1, search: value || undefined })}
        />

        <Select
          value={ownership ?? ALL_OWNERSHIPS}
          onValueChange={(value) =>
            update({
              page: 1,
              ownership: searchSchema.shape.ownership.parse(value),
            })
          }
        >
          <SelectTrigger
            className="w-56"
            aria-label={m.samples_ownership_filter()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OWNERSHIPS}>
              {m.samples_ownership_all()}
            </SelectItem>
            {Object.entries(OWNERSHIP_LABEL).map(([candidate, label]) => (
              <SelectItem key={candidate} value={candidate}>
                {label()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isPending ? (
        <p>{m.samples_loading()}</p>
      ) : query.isError ? (
        <p role="alert">{m.samples_error()}</p>
      ) : (
        <SampleTable
          samples={query.data.data}
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
