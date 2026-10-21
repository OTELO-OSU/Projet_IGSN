import { createFileRoute, notFound } from "@tanstack/react-router";

import { faqCategory } from "#/faq/faq-categories.ts";
import { faqSearchSchema } from "#/faq/faq-search.ts";
import { Faq } from "#/faq/faq.tsx";

export const Route = createFileRoute("/faq/$category")({
  validateSearch: faqSearchSchema,
  loader: ({ params }) => {
    if (!faqCategory(params.category)) {
      throw notFound();
    }
  },
  component: FaqCategoryPage,
});

function FaqCategoryPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <Faq
      category={faqCategory(Route.useParams().category)}
      query={q ?? ""}
      onQueryChange={(next) =>
        navigate({ search: { q: next || undefined }, replace: true })
      }
    />
  );
}
