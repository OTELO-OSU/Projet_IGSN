# Updating the FAQ

This guide is for anyone changing the public FAQ (`/faq`): rewording an answer, adding an answer block, a question or a category, or removing one. No programming knowledge is needed beyond copying the examples below.

## Where the FAQ lives

Two files, nothing else:

- The text: [packages/frontend/messages/en.json](../packages/frontend/messages/en.json), every line whose key starts with `faq_`.
- The order and grouping: [packages/frontend/src/faq/faq-categories.ts](../packages/frontend/src/faq/faq-categories.ts), in the `faqCategories()` list.

Each line of `en.json` pairs a key (left, never shown) with its text (right, shown on the page):

```json
"faq_igsn_title": "What is an IGSN?",
```

`faq-categories.ts` then places that text on the page by its key, written `m.faq_igsn_title()`.

The FAQ has a landing page (`/faq`) with a search box and one tile per category, and a page per category (`/faq/<slug>`, for example `/faq/account`) with its own search box over that category's questions. Both are built from `faqCategories()`, so the search, the tiles and the pages never need updating.

Each category holds questions, and each question holds an answer made of blocks: a block is a paragraph, or a bullet or numbered list.

## Reword a category, a question or an answer

1. In `en.json`, find the line holding the text.
2. Change the text between the quotes, leaving the key untouched.

That is all: `faq-categories.ts` does not change.

Writing rules:

- Plain text only: HTML, Markdown and links show exactly as typed.
- Quote a button or field name with curly quotes, as in “Add location”: a straight `"` would end the text early.
- Keep the comma at the end of the line.

## Add an answer block to an existing question

1. In `en.json`, add a line with a new key made of the question's prefix and a short name of your choice:

   ```json
   "faq_audience_answer_3": "Students are welcome too.",
   ```

2. In `faq-categories.ts`, add the key to that question's `answer` list, at the place it should appear:

   ```ts
   answer: [
     m.faq_audience_answer_1(),
     m.faq_audience_answer_2(),
     m.faq_audience_answer_3(),
   ],
   ```

The list order is the display order.

For a bullet or numbered list, add a list block, each item having its own line in `en.json`:

```ts
answer: [
  m.faq_sign_in_intro(),
  { ordered: true, items: [m.faq_sign_in_step_1(), m.faq_sign_in_step_2()] },
],
```

`ordered` is `true` for numbered steps, `false` for bullet points.

## Add a question

1. In `en.json`, add one line for the question and one per answer block:

   ```json
   "faq_deadline_title": "Is there a deadline to register a sample?",
   "faq_deadline_answer": "No, you can register a sample at any time.",
   ```

2. In `faq-categories.ts`, add an entry to the `questions` of the category where it should appear:

   ```ts
   {
     value: "deadline",
     title: m.faq_deadline_title(),
     answer: [m.faq_deadline_answer()],
   },
   ```

- `value` is a short unique name, in lowercase with dashes, never shown.
- Mind the commas between entries, as in the existing ones.

## Add a category

1. In `en.json`, add a line for its title, plus the lines of its questions as above:

   ```json
   "faq_category_publication": "Publication",
   ```

2. In `faq-categories.ts`, add an entry to the list returned by `faqCategories()`, where its tile should appear:

   ```ts
   {
     slug: "publication",
     title: m.faq_category_publication(),
     icon: SendIcon,
     questions: [
       {
         value: "deadline",
         title: m.faq_deadline_title(),
         answer: [m.faq_deadline_answer()],
       },
     ],
   },
   ```

- `slug` is the end of the page address (`/faq/publication`): lowercase, with dashes, unique, and best never changed once shared.
- `icon` is the picture on its tile: pick one on https://lucide.dev/icons, write its name in PascalCase followed by `Icon`, and add it to the `lucide-react` import at the top of the file.

## Remove an answer block, a question or a category

1. In `faq-categories.ts`, delete its line from `answer`, its entry from `questions`, or its whole entry from `faqCategories()`.
2. In `en.json`, delete its `faq_` lines.

## Keep the search rules true

The answers to "How does the search find samples?" describe rules set in the code. When a developer changes one of these, its sentence must change too:

| Sentence                                                         | Set in                                                                                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The fields searched (name, specific name, local name, IGSN)      | `SEARCHED_TEXTS` in [packages/api/src/sample/service/search-filter.ts](../packages/api/src/sample/service/search-filter.ts)                               |
| Typos forgiven from 5 letters                                    | `FUZZY_MIN_LENGTH`, same file                                                                                                                             |
| Only the first 6 words or quoted phrases, single letters skipped | `MAX_SEARCH_TOKENS` and `MIN_TOKEN_LENGTH` in [packages/domain/src/sample/search/search-tokens.ts](../packages/domain/src/sample/search/search-tokens.ts) |
| Quotes search an exact phrase                                    | [packages/domain/src/sample/search/parse-search-query.ts](../packages/domain/src/sample/search/parse-search-query.ts)                                     |
| `AND`/`ET` and `OR`/`OU` operators, in capitals                  | `OPERATORS` in [packages/domain/src/sample/search/parse-search-query.ts](../packages/domain/src/sample/search/parse-search-query.ts)                      |
| An area no bigger than a quarter of the globe                    | `MAX_SEARCH_BBOX_WORLD_FRACTION` in [packages/domain/src/sample/sample-validator.ts](../packages/domain/src/sample/sample-validator.ts)                   |

## Check your change

1. Run `make generate`, then `pnpm --filter @projet-igsn/frontend exec tsc -b`: a key spelled differently in the two files is reported by name.
2. Run `make dev`, open http://localhost:3000/faq, open each question, try the search field and the category tiles.
3. Run `pnpm test packages/frontend/src/faq packages/frontend/src/routes/faq`. The page tests look for the 7 category titles and the texts "How do I link my ORCID to my IGSN account?", "How do I sign in?", "through the RENATER identity federation", "Back to all questions" and "No question matches your search.": if you reword one of them, update [packages/frontend/src/faq/faq.spec.tsx](../packages/frontend/src/faq/faq.spec.tsx) or [packages/frontend/src/routes/faq/-$category.spec.tsx](../packages/frontend/src/routes/faq/-$category.spec.tsx) the same way.
4. Run `pnpm fmt:apply` to tidy the formatting.

The site ships in English and French, so edit the same keys in `en.json` and `fr.json`, or the key-parity spec fails.
