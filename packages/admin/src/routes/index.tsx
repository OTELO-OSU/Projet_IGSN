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

import { m } from "#/paraglide/messages.js";
import { SampleListPanel } from "#/samples/sample-list-panel.tsx";

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
  const params = Route.useSearch();
  const { search, ownership } = params;
  const navigate = Route.useNavigate();

  const update = (next: Partial<SampleListSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }) });

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

      <SampleListPanel params={params} update={update} />
    </>
  );
}
