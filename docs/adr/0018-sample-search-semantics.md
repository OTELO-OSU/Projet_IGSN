# 0018. Sample search semantics: token AND, wildcard anchoring, typo tolerance

Date: 2026-07-28

## Status

Accepted

Amended 2026-10-02: the search box runs in the ParadeDB index `sample_search_idx` instead of the pg_trgm GIN indexes, which changes the word definition, the typo tolerance, the escaping target, the bounds and the indexes below. The person facets keep pg_trgm.

Amended 2026-10-12: the public callers also match a token against the material classification labels, through the `publicSearchFilters` arm below.

Amended 2026-10-19: operators work in any case, and the material label arm now serves every `searchFilters` caller but `/service` (`serviceSearchFilters`) and the pickers, `publicSearchFilters` having become the default `searchFilters`.

Amended 2026-10-16: the search box also parses quoted phrases, `AND`/`OR` operators and parentheses, in `parse-search-query.ts`, extending the Grammar and Bounds below.

## Context

The public sample list has a free-text search box, separate from the `SAMPLE_FACETS` sidebar filters. Its grammar and its typo tolerance are a public contract: changing them changes what a shared `/search?q=...` link returns.

## Decision

**Grammar.** The query splits on whitespace; every token must match (AND), and a token matches on `name`, `specific_name` or `local_id` (OR), or on `igsn` by whole-token equality only. A word is a whitespace-separated word, punctuation being no boundary. `*` matches any run of characters inside one word, so it never spans two words: `bas*der` does not match "Basalt powder". The starless side of a token anchors to the word's start or end, `bas*` being "a word starting with bas" (it matches "basalt (x)" but not "Rock-basalt"), while a wildcard-free `gres` stays a substring inside one word and keeps matching "Grès de Fontainebleau". At most two wildcards apply per token (`MAX_WILDCARDS`), the extra `*` beyond that being literal, which bounds the pattern an untrusted query hands to the regex engine; only wildcards between two literals count, so `*bas*alt*` spends one of the two. The result highlighter agrees with this word definition.

**Phrases, operators and groups** (`parseSearchQuery` in `parse-search-query.ts`). Each term is a word or a quoted phrase, and `searchQueryTerms` lists them.

- `"…"` or `'…'` is an exact phrase: whole words, adjacent, in order, case and accent insensitive.
- A phrase has no typo tolerance, no substring match and no `*`.
- A phrase runs as ParadeDB `col ### immutable_unaccent(phrase)` on the three searched columns, plus the IGSN arm for a one-word phrase, plus the material label arm on every caller but `/service` and the pickers.
- A `'` opens a phrase only at a word start and closes it only at a word end, so `l'Étang` stays one word.
- An unclosed quote character is dropped.
- `AND` or `ET` and `OR` or `OU` are operators in any case, and a quoted one is a searched word.
- A space is an implicit AND, and AND binds tighter than OR.
- Parentheses group.
- The parser is lenient: a missing `)` closes at the end, a stray `)` or dangling operator is dropped, and `()` vanishes.
- A word keeps every arm above, and AND/OR nodes join in SQL.
- The highlighter (`highlight-match.ts`, `matchesSearchPhrase`) and the material labels (`matching-material-paths.ts`) follow the same terms.
- The person facets keep `searchTokens` and the grammar above.

**Material label arm.** `searchFilters` adds to each token's OR one `<path> = any(material_paths)` arm per material path whose own label matches the token, so "igneous" finds every sample at or under that node through the indexed ancestor array, inside ParadeDB. The label is the English catalog label as displayed ("Meta-" prefix included) and matches by substring in one word with `*` anchoring, case and accent insensitive, with no typo tolerance. The root `rock_and_sediment` is excluded, since it would match every sample. Paths are resolved in JS against the `domain` catalog (`createMatchingMaterialPaths`) into `material_paths` terms rather than a stored column. The public list, map and facet counts, the admin lists and the export use it; `/service` keeps the name-only `serviceSearchFilters` and the pickers `pickerSearchFilters`. Relevance ordering is unchanged, so a material-only hit ranks low.

**Bounds** (`search-tokens.ts`), because Tantivy's regex has a non-configurable 1000-state limit (about 480 bytes of regex, `unaccent` and escaping expanding one character to at most 6 bytes) and each very short word adds regex arms matching nearly every word (16 one-letter words OOM-killed the backend in a test).

- The search input is truncated at 128 characters (`MAX_SEARCH_TERM_LENGTH`); the person and text facets keep 200.
- A token needs at least 2 characters once `*` and combining marks are removed; shorter ones are dropped like `*`-only tokens.
- At most 6 terms (words or phrases) are kept, the extras being ignored, and duplicates no longer collapse.
- A phrase never reaches `pdb.regex`, so the regex bounds here do not apply to it, only the 128-character input cap and the 6-term cap.
- A token longer than 32 characters (`MAX_TOKEN_LENGTH`) matches nothing.
- Measured worst case with these bounds: about 60-235 MB peak backend memory per query on 200K rows.

**A search that states no term matches nothing.** A query trimming to blanks, bare wildcards (`*`, `** *`) or only too-short tokens drops every token, and `searchFilters` then answers `false` rather than no filter: the user asked for a search, so returning the whole registry would read as the filter having been silently dropped. An absent `search` param is the different case and still lists everything. The highlighter paints nothing for the same query, from the same `searchTokens`.

**Escaping happens in SQL, after `unaccent`, never in JS.** `unaccent` rewrites its input before the pattern exists: it turns some characters into new regex metacharacters (`©` to `(C)`) and deletes others (combining marks). A JS escape list runs before that rewrite, so it can never be complete. `search-filter.ts` escapes with `regexp_replace` on `unaccent()`'s own output instead. The target is now Tantivy's Rust regex syntax: lowercase, unaccent, then backslash-escape ASCII punctuation except `<` and `>` (Rust reads `\<` and `\>` as word boundaries), never escaping non-ASCII. It was verified once over 1,112,063 code points (U+0001 to U+10FFFF without surrogates) as one-character tokens through `pdb.regex`: 0 regex errors, 1,112,010 self-matches, 53 misses, accepted and not fixed:

- 5 whitespace characters (U+0009, U+000A, U+000C, U+000D, U+0020), never tokenized.
- 20 fractions whose unaccented form contains a space (U+00BC-00BE, U+2150-215F, U+2189, e.g. "½" to " 1/2"), which can never match a whitespace word, while the old `~*` did.
- 28 Unicode 16 capitals Postgres `lower()` leaves but Tantivy lowercases (U+A7CE, U+A7D2, U+A7D4, U+16EA0-16EB8).

Two earlier JS-side attempts each shipped a way to break the public endpoint: an unclosed group reaching Postgres' regex engine (a public 500), and a token expanding into a catastrophically backtracking pattern (190x CPU). The JS highlighter mirrors the grammar with `indexOf` rather than a RegExp for the same reason: the cap bounds the query, not the sample name, so cost must stay linear.

**A wildcard replaces typo tolerance rather than adding to it.** Fuzziness applies per token, only to tokens of 5+ characters carrying no `*`, since a wildcard already states where the user is unsure. It is ParadeDB `pdb.fuzzy(1, f, t)` on each searched column: Levenshtein distance 1, no prefix matching, a swap of two letters counting 1. `achondrites*` asks for a word starting with `achondrites` and matches nothing. Relevance ordering ignores wildcard tokens likewise. A single non-wildcard token found as a whole word on the stored unaccented text (`~* '\m...\M'`, escaped the same way as the filter) scores 1 without computing `word_similarity`, since word similarity is exactly 1 in that case; a multi-token needle still takes `GREATEST(word_similarity(...))` over the three columns, the ordering itself unchanged.

**Distance 1 replaces the 0.8 threshold for the search box.** The pg_trgm `word_similarity` threshold dropped near-miss geological terms (`achondrites`/`chondrites` 0.750) at the cost of missing short-root plurals (`basalts`/`Basalt`). Distance 1 accepts that tradeoff the other way: `achondrites` now finds both "Stony Achondrite" and "Chondrites Fragment", `basalts` finds "Basalt", and `chert` finds "chart". The near-miss rejection rule is dropped. `SAMPLE_SEARCH_FUZZY_THRESHOLD` (default `0.8`, read at boot, an unset, malformed or out-of-range value falling back to the default) now tunes the person facets alone.

**ParadeDB index `sample_search_idx`, which shapes the query.** Migration `20261002080000-add-sample-search-text.ts` indexes `name_unaccented`, `specific_name_unaccented` and `local_id_unaccented` with `pdb.whitespace` (lowercased whitespace words) and `igsn` as `pdb.literal`, and drops the three GIN trigram indexes on those columns. Every caller of `searchFilters` and `serviceSearchFilters` uses it: public list, map, facet counts, admin lists, `/service` and export; the admin sample pickers use `pickerSearchFilters` instead (see Consequences). The `<column>_unaccented` stored generated columns (`GENERATED ALWAYS AS (immutable_unaccent(coalesce(col, ''))) STORED`) stay, so the arms and the relevance score read them directly. Editing the unaccent rules file leaves a stored value stale until the row is rewritten (an `UPDATE`, triggering regeneration). Two constraints follow:

- ParadeDB ignores parameters or hangs under Postgres generic plans (paradedb#6492), so a transaction that scans ParadeDB (the facet count always; list, map and parent picker when a search is present) runs `set local plan_cache_mode = force_custom_plan`.
- A searched list, map or parent picker uses the count's indexed facet predicates (`<v> = any(<array field>)`) so ParadeDB narrows in the index, while a list without a search keeps the Postgres-form predicates and indexes.

**The person facets keep pg_trgm.** `chiefScientist` and `collectorName` match the typed names and the user table through the expression form `immutable_unaccent(coalesce(col, ''))` over `user.firstname`/`user.name`, with an expression index each, `SAMPLE_SEARCH_FUZZY_THRESHOLD` and the token rules above (2-character minimum, 6 tokens). Two constraints stay load-bearing there:

- `unaccent(text)` is `STABLE`, so Postgres refuses it in an index expression. An `immutable_unaccent(text)` wrapper pins the dictionary and asserts immutability (true unless the unaccent rules file is edited under a live index), schema-qualified because `CREATE INDEX` uses a restricted `search_path`. A query against a person facet must read `immutable_unaccent(coalesce(col, ''))` exactly as its expression index declares it, or the search silently falls back to a sequential scan with nothing else failing; `facet-filter.spec.ts` pins that with `enable_seqscan = off` and an `EXPLAIN`.
- `word_similarity(a, b) > threshold` is not indexable in function form, only as the `%>` operator, which reads the `pg_trgm.word_similarity_threshold` GUC. So the filter uses `%>` and `listSamples` sets the GUC with `set_config(..., is_local => true)` in its own transaction, reverting on commit instead of leaking onto the pooled connection. A single unindexable OR arm would drag the whole disjunction back to a sequential scan. The relevance `ORDER BY` keeps the function form, since it ranks rows rather than filtering them.

**Rejected: `tsvector` full-text search**, poor on substrings and on geological proper nouns, stemming a French/English mix of place names being worse than trigrams here. **Rejected: pure `similarity()` on the whole query**, since whole-string similarity against a long name falls under any usable threshold, so "gres" would stop matching "Grès de Fontainebleau".

Out of scope: the `text` facets keep their substring `ILIKE`.

## Consequences

- `igsn` matches by equality only (`igsn = upper(token)`), so wildcards, substrings and typo tolerance are `name`, `specific_name` and `local_id` only. A partial identifier finds nothing, a prefix of a Crockford base32 UUIDv7 being shared by every sample minted in the same millisecond. `igsn` is indexed as a `pdb.literal`, so it matches whole.
- The admin sample pickers (parent picker, second-parent dialog, series children picker, through `searchSamplePicker`) are the exception: `pickerSearchFilters` matches `name_unaccented` alone (same substring, wildcard and typo arms) plus a partial IGSN, any substring, case-insensitive (`strpos(igsn, upper(token)) > 0`), a `*` token matching names only. Specific name and local ID do not match there. The parent picker reaches every published sample, so a shared IGSN prefix floods it as it would public search: the pickers accept that noise to find a sample by any fragment, a longer fragment narrowing the 20 results. The IGSN arm stays outside ParadeDB: `igsn @@@ pdb.regex(...)` evaluated as a heap filter fails intermittently with `term ord should be retrievable`. The name arms still scan ParadeDB, so the `force_custom_plan` constraint above applies.
- A material label matches in English only, so a French label finds nothing, and a new material node is searchable by its label with no migration.
- A fraction character (`½`) can never match, its unaccented form containing a space.
- The grammar is documented nowhere in the UI, the search help popover that once explained it having been removed.
