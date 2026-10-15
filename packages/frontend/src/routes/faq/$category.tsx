import { createFileRoute, notFound } from "@tanstack/react-router";

import { faqCategories } from "#/faq/faq-categories.ts";
import { faqSearchSchema } from "#/faq/faq-search.ts";
import { Faq } from "#/faq/faq.tsx";

export const Route = createFileRoute("/faq/$category")({
  validateSearch: faqSearchSchema,
  loader: ({ params }) => {
    const category = faqCategories().find(
      ({ slug }) => slug === params.category,
    );
    if (!category) {
      throw notFound();
    }
    return category;
  },
  component: FaqCategoryPage,
});

function FaqCategoryPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <Faq
      category={Route.useLoaderData()}
      query={q ?? ""}
      onQueryChange={(next) =>
        navigate({ search: { q: next || undefined }, replace: true })
      }
    />
  );
}
