# 0018. Sample search semantics: token AND, wildcard anchoring, typo tolerance

Date: 2026-07-28

## Status

Accepted.

## Context

The public sample list has a free-text search box, separate from the
`SAMPLE_FACETS` sidebar filters. Its grammar and its typo tolerance are a public
contract: changing them changes what a shared `/search?q=...` link returns. Two
follow-up tickets (quoted exact search, `AND`/`OR` operators) build on the
grammar.

## Decision

**Grammar.** The query splits on whitespace; every token must match (AND), and a
token matches on `name`, `specific_name` or `igsn` (OR), `igsn` by whole-token
equality only. `*` matches any run of
non-space characters, so it never spans two words: `bas*der` does not match
"Basalt powder". The starless side of a token anchors to a word boundary
(`bas*` is "a word starting with bas"), while a wildcard-free `gres` stays a free
substring and keeps matching "Grès de Fontainebleau". At most two wildcards apply
per token (`MAX_WILDCARDS`); beyond that the extra `*` is literal, bounding the
pattern an untrusted query hands to the regex engine. Only wildcards _between_
two literals count, so `*bas*alt*` spends one of the two.

**A search that states no term matches nothing.** A query trimming to blanks or
bare wildcards (`*`, `** *`) drops every token, and `searchFilters` then answers
`false` rather than no filter: the user asked for a search, so returning the
whole registry would read as the filter having been silently dropped. An absent
`search` param is the different case and still lists everything. The highlighter
paints nothing for the same query, from the same `searchTokens`.

**Escaping happens in SQL, after `unaccent`, never in JS.** `unaccent` rewrites
its input before the pattern exists: it turns some characters into new regex
metacharacters (`©` to `(C)`) and deletes others (combining marks). A JS escape
list runs before that rewrite, so it can never be complete. `search-filter.ts`
escapes with `regexp_replace` on `unaccent()`'s own output instead, verified
across all 1,114,111 code points. Two earlier JS-side attempts each shipped a way
to break the public endpoint: an unclosed group reaching Postgres' regex engine
(a public 500), and a token expanding into a catastrophically backtracking
pattern (190x CPU). Escape in SQL, on `unaccent`'s output, or not at all. The JS
highlighter mirrors the grammar with `indexOf` rather than a RegExp for the same
reason: the cap bounds the query, not the sample name, so cost must stay linear.

**A wildcard replaces typo tolerance rather than adding to it.** Fuzziness
applies per token, only to tokens of 5+ characters carrying no `*`: a wildcard
already states where the user is unsure. `achondrites` matches "Stony
Achondrite" fuzzily; `achondrites*` asks for a word starting with `achondrites`
and matches nothing. Relevance ordering ignores wildcard tokens likewise.

**0.8 fuzzy threshold, with a runtime knob.** No threshold separates real typos
from neighbouring geological terms: `fontenebleau`/`Fontainebleau` (0.588) scores
below `achondrites`/`chondrites` (0.750), an opposite category. 0.8 resolves that
for precision: inflections of a long root survive (`achondrites`/`stony
achondrite` 0.833, `sandstones`/`Sandstone` 0.818), the near-miss term and the
plural of a short root (`basalts`/`Basalt` 0.750) do not, and larger typos stay
uncaught by design. `SAMPLE_SEARCH_FUZZY_THRESHOLD` (default `0.8`, read at boot) retunes it
against real sample names without a release; unset, malformed or out of `(0, 1]`
it falls back to the default, so a typo in the deploy env degrades the ranking
rather than breaking the public search.

**GIN trigram indexes, which shape the query.** One `gin_trgm_ops` expression
index per searched column (migration `20260728092114`) covers both arms: 250ms
sequential scan to 0.7ms `BitmapOr` on 50k rows. Two constraints follow, both
load-bearing:

- `unaccent(text)` is `STABLE`, so Postgres refuses it in an index expression. An
  `immutable_unaccent(text)` wrapper pins the dictionary and asserts immutability
  (true unless the unaccent rules file is edited under a live index),
  schema-qualified because `CREATE INDEX` uses a restricted `search_path`. Every
  query must then read `immutable_unaccent(coalesce(col, ''))` exactly as the
  index declares it, or the search silently falls back to a sequential scan with
  nothing else failing; `search-filter.spec.ts` pins that with
  `enable_seqscan = off` and an `EXPLAIN`.
- `word_similarity(a, b) > threshold` is not indexable in function form, only as
  the `%>` operator, which reads the `pg_trgm.word_similarity_threshold` GUC. So
  the filter uses `%>` and `listSamples` sets the GUC with
  `set_config(..., is_local => true)` in its own transaction, reverting on commit
  instead of leaking onto the pooled connection. A single unindexable OR arm
  would drag the whole disjunction back to a sequential scan. The relevance
  `ORDER BY` keeps the function form: it ranks rows, it does not filter them.

**Rejected: `tsvector` full-text search.** Poor on substrings and on geological
proper nouns; stemming a French/English mix of place names is worse than trigrams
here.

**Rejected: pure `similarity()` on the whole query.** Whole-string similarity
against a long name falls under any usable threshold, so "gres" would stop
matching "Grès de Fontainebleau".

**Out of scope.** The `text` facets keep their substring `ILIKE`. Quoted exact
search and `AND`/`OR` operators are separate tickets.

## Consequences

- `igsn` matches by equality only (`igsn = upper(token)`; `igsnSchema` stores it
  uppercase), so wildcards, substrings and typo tolerance are `name` and
  `specific_name` only. A partial identifier finds nothing: a prefix of a
  Crockford base32 UUIDv7 is shared by every sample minted in the same
  millisecond, so it identifies no sample. Equality rides the unique
  constraint's index, so `igsn` carries no trigram index (migration
  `20260804144413` dropped it); restoring a substring arm restores that index.
- The search help popover ships English only; the app has no French catalog yet.
