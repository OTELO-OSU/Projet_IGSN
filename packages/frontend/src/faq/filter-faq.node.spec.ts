import { InfoIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import type { FaqCategory } from "./faq-categories.ts";

import { filterFaq } from "./filter-faq.ts";

const IGSN = {
  value: "igsn",
  title: "What is an IGSN?",
  answer: ["A persistent identifier."],
};
const ORCID = {
  value: "orcid",
  title: "How do I link my account?",
  answer: [
    "Open your profile.",
    { ordered: false, items: ["Add your ORCID iD.", "Authorise the app."] },
  ],
};
const DEPOSIT = {
  value: "deposit",
  title: "Where is the dépôt?",
  answer: ["In the lab."],
};
const GENERAL = {
  slug: "general",
  title: "General",
  icon: InfoIcon,
  questions: [IGSN, ORCID],
};
const USAGE = {
  slug: "usage",
  title: "Using an IGSN",
  icon: InfoIcon,
  questions: [DEPOSIT],
};
const CATEGORIES: FaqCategory[] = [GENERAL, USAGE];

describe("filterFaq", () => {
  it.each([
    {
      rule: "a title holding every word",
      query: "what igsn",
      expected: [{ ...GENERAL, questions: [IGSN] }],
    },
    {
      rule: "an answer holding every word across its blocks",
      query: "profile authorise",
      expected: [{ ...GENERAL, questions: [ORCID] }],
    },
    {
      rule: "a match ignoring case and accents",
      query: " DEPOT ",
      expected: [USAGE],
    },
    {
      rule: "nothing when one word is missing",
      query: "orcid zzz",
      expected: [],
    },
    { rule: "everything for a blank query", query: "  ", expected: CATEGORIES },
  ])("should keep $rule, dropping empty categories", ({ query, expected }) => {
    expect(filterFaq(CATEGORIES, query)).toEqual(expected);
  });
});
