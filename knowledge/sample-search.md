---
type: feature
title: Free-text sample search semantics
description: >-
  Tokens AND, wildcards anchor at word boundaries, 5+ character tokens are
  typo-tolerant at 0.8, all escaping done in SQL after unaccent.
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

**Grammar.** The query splits on whitespace; every token must match (AND), and a token matches on `name`, `specific_name` or `igsn` (OR), `igsn` by whole-token equality only.

- `*` matches any run of non-space characters, so it never spans two words.
- The starless side of a token anchors to a word boundary (`bas*` is "a word starting with bas"), while a wildcard-free token stays a free substring.
- At most two wildcards apply per token (`MAX_WILDCARDS`), extra `*` being literal, which bounds the pattern an untrusted query hands the regex engine; only wildcards between two literals count.
- A query that states no term (blanks, bare `*`) drops every token and `searchFilters` answers `false`, matching nothing, since returning the whole registry would read as the filter being silently dropped. An absent `search` param is the different case and still lists everything.

**Escaping happens in SQL, after `unaccent`, never in JS.** `unaccent` rewrites its input before the pattern exists, turning some characters into new regex metacharacters (`©` to `(C)`) and deleting others, so a JS escape list can never be complete. `search-filter.ts` escapes with `regexp_replace` on `unaccent()`'s own output, verified across all 1,114,111 code points. The JS highlighter mirrors the grammar with `indexOf` rather than a RegExp for the same reason, cost staying linear.

**Typo tolerance.** Fuzziness applies per token, only to tokens of 5+ characters carrying no `*`, a wildcard already stating where the user is unsure; relevance ordering ignores wildcard tokens likewise. The threshold is 0.8, tuned for precision, with `SAMPLE_SEARCH_FUZZY_THRESHOLD` read at boot as a runtime knob; an unset, malformed or out-of-range value falls back to the default.

**GIN trigram indexes shape the query**, one `gin_trgm_ops` expression index per searched column (250ms sequential scan down to 0.7ms `BitmapOr` on 50k rows). Two load-bearing constraints:

- `unaccent(text)` is `STABLE`, so an `immutable_unaccent(text)` wrapper pins the dictionary; every query must read `immutable_unaccent(coalesce(col, ''))` exactly as the index declares it or the search silently falls back to a sequential scan. `search-filter.spec.ts` pins that with `enable_seqscan = off` and an `EXPLAIN`.
- `word_similarity` is indexable only as the `%>` operator, which reads the `pg_trgm.word_similarity_threshold` GUC, so `listSamples` sets it with `set_config(..., is_local => true)` in its own transaction rather than leaking onto the pooled connection. A single unindexable OR arm would drag the whole disjunction to a sequential scan; the relevance `ORDER BY` keeps the function form.
- `igsn` carries no trigram index, equality riding the unique constraint.
- The grammar is documented nowhere in the UI.
