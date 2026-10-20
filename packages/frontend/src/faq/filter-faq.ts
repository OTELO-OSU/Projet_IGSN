import { normalizeSearch } from "@projet-igsn/domain/text/normalize-search";

import type { FaqCategory, FaqQuestion } from "./faq-categories.ts";

function containsAll(text: string, words: string[]): boolean {
  const normalized = normalizeSearch(text);
  return words.every((word) => normalized.includes(word));
}

function answerText({ answer }: FaqQuestion): string {
  return answer
    .map((block) => {
      if (typeof block === "string") {
        return block;
      }
      return "items" in block ? block.items.join("\n") : block.label;
    })
    .join("\n");
}

export function filterFaq(
  categories: FaqCategory[],
  query: string,
): FaqCategory[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return categories.flatMap((category) => {
    const questions = category.questions.filter(
      (question) =>
        containsAll(question.title, words) ||
        containsAll(answerText(question), words),
    );
    return questions.length > 0 ? [{ ...category, questions }] : [];
  });
}
