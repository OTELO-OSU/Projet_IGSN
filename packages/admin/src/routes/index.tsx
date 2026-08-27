import type { z } from "zod";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { Link, createFileRoute } from "@tanstack/react-router";

import { ListHeader } from "#/filters/list-header.tsx";
import { searchFilterEntry } from "#/filters/search-filter-entry.tsx";
import { SelectFilter } from "#/filters/select-filter.tsx";
import { m } from "#/paraglide/messages.js";
import { sampleFilterEntries } from "#/samples/sample-filters.tsx";
import { SampleListPanel } from "#/samples/sample-list-panel.tsx";

const searchSchema = listSamplesQuerySchema.pick({
  page: true,
  perPage: true,
  sort: true,
  order: true,
  search: true,
  ownership: true,
  nature: true,
  collectionMethod: true,
  status: true,
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

function SampleListPage() {
  const params = Route.useSearch();
  const { search, ownership } = params;
  const navigate = Route.useNavigate();

  const update = (next: Partial<SampleListSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }) });

  return (
    <>
      <ListHeader
        title={m.samples_title()}
        action={
          <Button asChild>
            <Link to="/samples/create">{m.action_create()}</Link>
          </Button>
        }
        filters={[
          searchFilterEntry({
            label: m.samples_search_label(),
            placeholder: m.samples_search_placeholder(),
            defaultValue: search,
            className: "col-span-3",
            onSearch: (value) =>
              update({ page: 1, search: value || undefined }),
          }),
          {
            name: "ownership",
            label: m.samples_ownership_filter(),
            cell: (
              <SelectFilter
                id="ownership-filter"
                label={m.samples_ownership_filter()}
                anyLabel={m.samples_ownership_all()}
                items={Object.entries(OWNERSHIP_LABEL).map(
                  ([candidate, label]) => ({
                    value: candidate,
                    label: label(),
                  }),
                )}
                value={ownership}
                onChange={(value) =>
                  update({
                    page: 1,
                    ownership: searchSchema.shape.ownership.parse(value),
                  })
                }
              />
            ),
          },
          ...sampleFilterEntries({
            values: params,
            onChange: (next) => update({ page: 1, ...next }),
          }),
        ]}
      />

      <SampleListPanel params={params} update={update} />
    </>
  );
}
