import type { z } from "zod";

import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { canModerateSamples } from "@projet-igsn/domain/user/can-moderate-samples";
import { createFileRoute } from "@tanstack/react-router";

import { RouteGuard } from "#/auth/route-guard.tsx";
import { m } from "#/paraglide/messages.js";
import { SampleListPanel } from "#/samples/sample-list-panel.tsx";

const searchSchema = listSamplesQuerySchema.pick({
  page: true,
  perPage: true,
  sort: true,
  order: true,
  search: true,
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

      <SearchField
        defaultValue={params.search}
        label={m.samples_search_label()}
        placeholder={m.samples_search_placeholder()}
        onSearch={(value) => update({ page: 1, search: value || undefined })}
      />

      <SampleListPanel params={params} update={update} moderated />
    </>
  );
}
