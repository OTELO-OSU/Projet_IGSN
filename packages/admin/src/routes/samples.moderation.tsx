import type { z } from "zod";

import { Label } from "@projet-igsn/design-system/components/ui/label";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { canModerateSamples } from "@projet-igsn/domain/user/can-moderate-samples";
import { createFileRoute } from "@tanstack/react-router";

import { RouteGuard } from "#/auth/route-guard.tsx";
import { ListHeader } from "#/filters/list-header.tsx";
import { searchFilterEntry } from "#/filters/search-filter-entry.tsx";
import { institutionFilterEntry } from "#/institutional-groups/institution-tree-filter.tsx";
import { manualGroupFilterEntry } from "#/manual-groups/manual-group-filter.tsx";
import { m } from "#/paraglide/messages.js";
import { sampleFilterEntries } from "#/samples/sample-filters.tsx";
import { SampleListPanel } from "#/samples/sample-list-panel.tsx";
import { SampleOwnerFilter } from "#/samples/sample-owner-filter.tsx";

const searchSchema = listSamplesQuerySchema.pick({
  page: true,
  perPage: true,
  sort: true,
  order: true,
  search: true,
  ownerId: true,
  institution: true,
  manualGroup: true,
  nature: true,
  collectionMethod: true,
  status: true,
});

export const Route = createFileRoute("/samples/moderation")({
  validateSearch: searchSchema,
  component: () => (
    <RouteGuard allow={canModerateSamples}>
      <SampleModerationPage />
    </RouteGuard>
  ),
});

type SampleModerationSearch = z.infer<typeof searchSchema>;

function SampleModerationPage() {
  const params = Route.useSearch();
  const navigate = Route.useNavigate();

  const update = (next: Partial<SampleModerationSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }) });

  return (
    <>
      <ListHeader
        title={m.sample_moderation_title()}
        filters={[
          searchFilterEntry({
            label: m.samples_search_label(),
            placeholder: m.samples_search_placeholder(),
            defaultValue: params.search,
            className: "sm:col-span-2",
            onSearch: (value) =>
              update({ page: 1, search: value || undefined }),
          }),
          {
            name: "ownerId",
            label: m.filter_researcher_label(),
            cell: (
              <>
                <Label htmlFor="owner-filter">
                  {m.filter_researcher_label()}
                </Label>
                <SampleOwnerFilter
                  id="owner-filter"
                  value={params.ownerId}
                  onChange={(ownerId) => update({ page: 1, ownerId })}
                />
              </>
            ),
          },
          institutionFilterEntry({
            value: params.institution,
            onChange: (institution) => update({ page: 1, institution }),
          }),
          manualGroupFilterEntry({
            value: params.manualGroup,
            onChange: (manualGroup) => update({ page: 1, manualGroup }),
            onRemove: () => update({ page: 1, manualGroup: undefined }),
          }),
          ...sampleFilterEntries({
            values: params,
            onChange: (next) => update({ page: 1, ...next }),
          }),
        ]}
      />

      <SampleListPanel params={params} update={update} moderated />
    </>
  );
}
