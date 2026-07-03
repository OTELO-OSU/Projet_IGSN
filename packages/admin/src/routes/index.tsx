import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  PAGE_SIZES,
  listSamplesQuerySchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Pagination } from "#/pagination/pagination.tsx";
import { m } from "#/paraglide/messages.js";
import { SampleTable } from "#/samples/sample-table.tsx";
import { useSamples } from "#/samples/use-samples.ts";

export const Route = createFileRoute("/")({
  validateSearch: listSamplesQuerySchema,
  component: SampleListPage,
});

function SampleListPage() {
  const { page, perPage } = Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useSamples({ page, perPage });

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{m.samples_title()}</h1>
        <Button asChild>
          <Link to="/samples/create">{m.action_create()}</Link>
        </Button>
      </div>

      {query.isPending ? (
        <p>{m.samples_loading()}</p>
      ) : query.isError ? (
        <p role="alert">{m.samples_error()}</p>
      ) : (
        <SampleTable samples={query.data.data} />
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        perPage={perPage}
        pageSizes={PAGE_SIZES}
        onPageChange={(nextPage) =>
          navigate({ search: { page: nextPage, perPage } })
        }
        onPerPageChange={(nextPerPage) =>
          navigate({ search: { page: 1, perPage: nextPerPage } })
        }
      />
    </>
  );
}
