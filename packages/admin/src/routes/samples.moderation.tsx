import type { z } from "zod";

import { Label } from "@projet-igsn/design-system/components/ui/label";
import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { canModerateSamples } from "@projet-igsn/domain/user/can-moderate-samples";
import { createFileRoute } from "@tanstack/react-router";

import { RouteGuard } from "#/auth/route-guard.tsx";
import { InstitutionTreeFilter } from "#/institutional-groups/institution-tree-filter.tsx";
import { m } from "#/paraglide/messages.js";
import { SampleListPanel } from "#/samples/sample-list-panel.tsx";
import { SampleManualGroupFilter } from "#/samples/sample-manual-group-filter.tsx";
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
      <h1 className="text-2xl font-bold">{m.sample_moderation_title()}</h1>

      <div className="grid grid-cols-4 items-end gap-4">
        <SearchField
          defaultValue={params.search}
          label={m.samples_search_label()}
          placeholder={m.samples_search_placeholder()}
          onSearch={(value) => update({ page: 1, search: value || undefined })}
        />

        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="owner-filter">{m.filter_researcher_label()}</Label>
          <SampleOwnerFilter
            id="owner-filter"
            value={params.ownerId}
            onChange={(ownerId) => update({ page: 1, ownerId })}
          />
        </div>

        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="institution-filter">
            {m.filter_institution_label()}
          </Label>
          <InstitutionTreeFilter
            id="institution-filter"
            value={params.institution}
            onChange={(institution) => update({ page: 1, institution })}
          />
        </div>

        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="manual-group-filter">
            {m.filter_manual_group_label()}
          </Label>
          <SampleManualGroupFilter
            id="manual-group-filter"
            value={params.manualGroup}
            onChange={(manualGroup) => update({ page: 1, manualGroup })}
          />
        </div>
      </div>

      <SampleListPanel params={params} update={update} moderated />
    </>
  );
}
