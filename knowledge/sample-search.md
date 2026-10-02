---
type: feature
title: Free-text sample search semantics
description: >-
  Tokens AND inside the ParadeDB index, wildcards anchor at whitespace-word
  edges, 5+ character tokens are typo-tolerant at Levenshtein distance 1, all
  escaping done in SQL after unaccent.
resource: packages/domain/src/sample/search/search-tokens.ts
tags:
  - search
  - public-contract
  - api
relations:
  - type: depends_on
    target: kysely-dbal
  - type: depends_on
    target: igsn-identifier
status: stable
---

The public sample list's free-text box is a separate mechanism from the facet sidebar ([[search-facets]]). Its grammar and typo tolerance are a public contract: changing them changes what a shared `/search?q=...` link returns.

**Grammar.** The query splits on whitespace; every token must match (AND), and a token matches on `name`, `specific_name` or `local_id` (OR), or on `igsn` by whole-token equality only. The search runs in the ParadeDB index `sample_search_idx` for every `searchFilters` caller.

- A word is a whitespace-separated word, punctuation being no boundary.
- `*` matches any run of characters inside one word, so it never spans two words.
- The starless side of a token anchors to the word's start or end (`bas*` matches "basalt (x)" but not "Rock-basalt"), while a wildcard-free token stays a substring inside one word.
- Bounds (`search-tokens.ts`): input truncated at 128 characters, tokens under 2 characters (once `*` and combining marks are removed) dropped, duplicates collapsed, at most 6 tokens kept, a token over 32 characters matching nothing.
- At most two wildcards apply per token (`MAX_WILDCARDS`), extra `*` being literal, which bounds the pattern an untrusted query hands the regex engine; only wildcards between two literals count.
- A query that states no term (blanks, bare `*`) drops every token and `searchFilters` answers `false`, matching nothing, since returning the whole registry would read as the filter being silently dropped. An absent `search` param is the different case and still lists everything.

**Escaping happens in SQL, after `unaccent`, never in JS.** `unaccent` rewrites its input before the pattern exists, turning some characters into new regex metacharacters (`©` to `(C)`) and deleting others, so a JS escape list can never be complete. `search-filter.ts` escapes with `regexp_replace` on `unaccent()`'s own output, for Tantivy's Rust regex syntax (ASCII punctuation escaped except `<` and `>`, never non-ASCII), verified over 1,112,063 code points with 53 accepted misses (whitespace, fractions whose unaccented form has a space, 28 Unicode 16 capitals); see ADR 0018. The JS highlighter mirrors the grammar with `indexOf` rather than a RegExp for the same reason, cost staying linear.

**Typo tolerance.** Fuzziness applies per token, only to tokens of 5+ characters carrying no `*`, a wildcard already stating where the user is unsure; relevance ordering ignores wildcard tokens likewise. It is ParadeDB `pdb.fuzzy(1, f, t)`: Levenshtein distance 1, no prefix matching, a swap of two letters counting 1. So `achondrites` finds both "Stony Achondrite" and "Chondrites Fragment", `basalts` finds "Basalt" and `chert` finds "chart".

**ParadeDB index `sample_search_idx` shapes the query.** It indexes `name_unaccented`, `specific_name_unaccented` and `local_id_unaccented` with `pdb.whitespace` and `igsn` as `pdb.literal`, replacing the three trigram GIN indexes. Two load-bearing constraints:

- ParadeDB ignores parameters or hangs under Postgres generic plans, so a transaction that scans it (the facet count always; list, map and parent picker when a search is present) runs `set local plan_cache_mode = force_custom_plan`.
- A searched list, map or parent picker uses the count's indexed facet predicates (`<v> = any(<array field>)`), a list without a search keeping the Postgres-form predicates.
- The relevance `ORDER BY` still uses `word_similarity`, unchanged.
- The person facets keep pg_trgm and `SAMPLE_SEARCH_FUZZY_THRESHOLD` ([[search-facets]]).
- The grammar is documented nowhere in the UI.
