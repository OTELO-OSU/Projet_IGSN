import { createFileRoute } from "@tanstack/react-router";

import { faqSearchSchema } from "#/faq/faq-search.ts";
import { Faq } from "#/faq/faq.tsx";

export const Route = createFileRoute("/faq/")({
  validateSearch: faqSearchSchema,
  component: FaqPage,
});

function FaqPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <Faq
      query={q ?? ""}
      onQueryChange={(next) =>
        navigate({ search: { q: next || undefined }, replace: true })
      }
    />
  );
}
