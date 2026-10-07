import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@projet-igsn/design-system/components/ui/accordion";
import { SearchInput } from "@projet-igsn/design-system/components/ui/search-input";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";

import { type FaqItem, filterFaq } from "./filter-faq.ts";

function faqItems(): FaqItem[] {
  return [
    {
      value: "search",
      title: m.faq_search_title(),
      ordered: true,
      entries: [
        m.faq_search_step_words(),
        m.faq_search_step_location(),
        m.faq_search_step_filters(),
        m.faq_search_step_map(),
      ],
    },
    {
      value: "search-rules",
      title: m.faq_search_rules_title(),
      ordered: false,
      entries: [
        m.faq_search_rule_fields(),
        m.faq_search_rule_case(),
        m.faq_search_rule_typo(),
        m.faq_search_rule_wildcard(),
        m.faq_search_rule_limits(),
        m.faq_search_rule_area(),
        m.faq_search_rule_published(),
      ],
    },
  ];
}

export function Faq() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string[]>([]);
  const matches = filterFaq(faqItems(), query);

  function search(next: string) {
    setQuery(next);
    setOpen(
      next.trim() ? filterFaq(faqItems(), next).map(({ value }) => value) : [],
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-primary text-4xl font-bold">{m.faq_title()}</h1>
      <div className="mt-8">
        <SearchInput
          label={m.faq_filter_label()}
          placeholder={m.faq_filter_placeholder()}
          value={query}
          onChange={(event) => search(event.target.value)}
          className="h-12"
        />
      </div>
      {matches.length === 0 ? (
        <p role="status" className="text-muted-foreground mt-8">
          {m.faq_no_match()}
        </p>
      ) : (
        <Accordion
          type="multiple"
          value={open}
          onValueChange={setOpen}
          className="mt-6"
        >
          {matches.map(({ value, title, ordered, entries }) => {
            const List = ordered ? "ol" : "ul";
            return (
              <AccordionItem key={value} value={value}>
                <AccordionTrigger className="text-primary text-lg font-semibold">
                  {title}
                </AccordionTrigger>
                <AccordionContent className="text-base">
                  <List
                    className={`space-y-3 ps-6 ${ordered ? "list-decimal" : "list-disc"}`}
                  >
                    {entries.map(({ position, text }) => (
                      <li key={text} value={ordered ? position : undefined}>
                        {text}
                      </li>
                    ))}
                  </List>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
