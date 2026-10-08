# Updating the FAQ

This guide is for anyone changing the public FAQ page (`/faq`): rewording an answer, adding one, adding a question, or removing one. No programming knowledge is needed beyond copying the examples below.

## Where the FAQ lives

Two files, nothing else:

- The text: [packages/frontend/messages/en.json](../packages/frontend/messages/en.json), every line whose key starts with `faq_`.
- The order and grouping: [packages/frontend/src/faq/faq.tsx](../packages/frontend/src/faq/faq.tsx), in the `faqItems()` list.

Each line of `en.json` pairs a key (left, never shown) with its text (right, shown on the page):

```json
"faq_search_rule_case": "No need to worry about capitals or accents: “rhone” also finds “Rhône”.",
```

`faq.tsx` then places that text on the page by its key, written `m.faq_search_rule_case()`.

The search field at the top of the page filters whatever is listed, so it never needs updating.

## Reword a question or an answer

1. In `en.json`, find the line holding the text.
2. Change the text between the quotes, leaving the key untouched.

That is all: `faq.tsx` does not change.

Writing rules:

- Plain text only: HTML, Markdown and links show exactly as typed.
- Quote a button or field name with curly quotes, as in “Add location”: a straight `"` would end the text early.
- Keep the comma at the end of the line.

## Add an answer to an existing question

1. In `en.json`, add a line next to the question's other `faq_` lines, with a new key made of the question's prefix and a short name of your choice:

   ```json
   "faq_search_rule_sort": "The best matches come first.",
   ```

2. In `faq.tsx`, add the key to that question's `entries` list, at the place it should appear:

   ```ts
   entries: [
     m.faq_search_rule_fields(),
     m.faq_search_rule_sort(),
     m.faq_search_rule_case(),
   ],
   ```

The list order is the display order, and the numbers of a numbered question follow it.

## Add a question

1. In `en.json`, add one line for the question and one per answer:

   ```json
   "faq_account_title": "How do I get an account?",
   "faq_account_sign_in": "Click “Sign in” and choose your institution or ORCID.",
   ```

2. In `faq.tsx`, add a block to the list returned by `faqItems()`, where the question should appear:

   ```ts
   {
     value: "account",
     title: m.faq_account_title(),
     ordered: false,
     entries: [m.faq_account_sign_in()],
   },
   ```

- `value` is a short unique name, in lowercase with dashes, never shown.
- `ordered` is `true` for numbered steps, `false` for bullet points.
- Mind the commas between blocks, as in the existing ones.

## Remove an answer or a question

1. In `faq.tsx`, delete its line from `entries`, or its whole block from `faqItems()`.
2. In `en.json`, delete its `faq_` lines.

## Keep the search rules true

The answers to "How does the search find samples?" describe rules set in the code. When a developer changes one of these, its sentence must change too:

| Sentence                                                  | Set in                                                                                                                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The fields searched (name, specific name, local ID, IGSN) | `SEARCHED_TEXTS` in [packages/api/src/sample/service/search-filter.ts](../packages/api/src/sample/service/search-filter.ts)                               |
| Typos forgiven from 5 letters                             | `FUZZY_MIN_LENGTH`, same file                                                                                                                             |
| Only the first 6 words, single letters skipped            | `MAX_SEARCH_TOKENS` and `MIN_TOKEN_LENGTH` in [packages/domain/src/sample/search/search-tokens.ts](../packages/domain/src/sample/search/search-tokens.ts) |
| An area no bigger than a quarter of the globe             | `MAX_SEARCH_BBOX_WORLD_FRACTION` in [packages/domain/src/sample/sample-validator.ts](../packages/domain/src/sample/sample-validator.ts)                   |

## Check your change

1. Run `make generate`, then `pnpm --filter @projet-igsn/frontend exec tsc -b`: a key spelled differently in the two files is reported by name.
2. Run `make dev`, open http://localhost:3000/faq, open each question and try the search field.
3. Run `pnpm test packages/frontend/src/faq`. The page test looks for the texts "How does the search find samples?", "Small typos are forgiven" and "Only published samples": if you reword one of them, update [packages/frontend/src/faq/faq.spec.tsx](../packages/frontend/src/faq/faq.spec.tsx) the same way.
4. Run `pnpm fmt:apply` to tidy the formatting.

The site is in English only today, so `en.json` is the one text file to edit.
