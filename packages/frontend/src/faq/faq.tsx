import { SearchInput } from "@projet-igsn/design-system/components/ui/search-input";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { PageBanner } from "#/page-banner.tsx";
import { m } from "#/paraglide/messages.js";

import { type FaqCategory, faqCategories } from "./faq-categories.ts";
import { FaqQuestions } from "./faq-questions.tsx";
import { filterFaq } from "./filter-faq.ts";

export function Faq({
  category,
  query,
  onQueryChange,
}: {
  category?: FaqCategory;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const matches = filterFaq(category ? [category] : faqCategories(), query);

  return (
    <>
      <PageBanner title={category?.title ?? m.faq_title()} />
      <div className="mx-auto max-w-3xl px-6 py-16">
        {category && (
          <Link
            to="/faq"
            className="text-primary mb-6 inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline"
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            {m.faq_all_questions()}
          </Link>
        )}
        <SearchInput
          label={m.faq_filter_label()}
          placeholder={m.faq_filter_placeholder()}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-12"
        />
        {!query.trim() ? (
          category ? (
            <div className="mt-8">
              <FaqQuestions questions={category.questions} />
            </div>
          ) : (
            <nav aria-label={m.faq_categories_label()} className="mt-8">
              <ul className="grid gap-4 sm:grid-cols-2">
                {matches.map(({ slug, title, icon: Icon }) => (
                  <li key={slug}>
                    <Link
                      to="/faq/$category"
                      params={{ category: slug }}
                      className="text-primary hover:bg-primary/5 flex h-full items-center gap-4 rounded-lg border p-6 text-lg font-semibold"
                    >
                      <span
                        aria-hidden
                        className="text-primary flex size-12 shrink-0 items-center justify-center rounded-full bg-[#d1e7f4]"
                      >
                        <Icon className="size-6" />
                      </span>
                      {title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )
        ) : matches.length === 0 ? (
          <p role="status" className="text-muted-foreground mt-8">
            {m.faq_no_match()}
          </p>
        ) : (
          <div key={query}>
            {matches.map(({ slug, title, questions }) => (
              <section key={slug} className="mt-10">
                {!category && <h2 className="text-2xl font-bold">{title}</h2>}
                <FaqQuestions questions={questions} expanded />
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
