---
name: add-search-facet
description: Use when adding or extending a public search facet on the sample list (a hierarchy, enum, text, or numeric-range filter). Covers the SAMPLE_FACETS registry as single source of truth, the query-schema drift-guard, the searchable node flag, the API column allow-list, and the label/i18n wiring.
---

# Add a search facet

A search facet is a public filter on the sample list. The registry
`SAMPLE_FACETS` in `packages/domain/src/sample/search/facets.ts` is the single
source of truth: the list query schema, the API filter builder, and the
frontend sidebar all derive from it. Adding a facet is a registry entry plus
its column mapping and labels, never a new UI component; the sidebar renders
every registry entry automatically.

Follow TDD (spec first).

## The facet kinds

- `hierarchy`: a dot-path vocabulary (type, material, collection method).
  Matches at-or-under the picked node (ltree `<@`).
- `enum`: a flat controlled vocabulary (nature, texture). Matches by equality.
- `text`: a free-text scientific-context field. Matches by unaccent ILIKE.
- `numericRange`: the age range. Not a generic column filter; it compares
  against dedicated comparable columns (`annum_min`, `annum_max`, generated
  from the numeric age with a fallback on the geological interval) via its
  own builder (`ageFilters`), and contributes three params (`<key>Min`,
  `<key>Max`, `<key>Unit`).

## Steps

The backing sample column must already exist (a declaration field). A facet
only exposes an existing column for filtering; it never adds one. If the column
is missing, that is a domain/API change first (see the `add-domain-entity` and
`add-api-endpoint` skills).

1. **Registry** (`domain/sample/search/facets.ts`): add an entry to
   `SAMPLE_FACETS` and the matching field to `facetQueryFields()`. The two MUST
   agree; the `facets.spec` drift-guard asserts the query keys match the
   registry (`facetParamKeys`). Query fields use `optionalFilter` /
   `textFilter` so a malformed URL degrades to "no filter", never a 400.
   Validate a `hierarchy` value against its vocabulary schema so a bad path
   never reaches the ltree cast.

2. **Hierarchy facets only**: flag each vocabulary node to expose with
   `searchable: true` in its `vocabulary.ts` (see the `TreeNode` shape in
   `sample/path/tree-node.ts`). There is no inheritance; flag every node the
   cascade should offer, at each level. See the `add-sample-vocabulary` skill
   for the tree shape.

3. **API column** (`api/sample/service/list-sample.ts`): add the facet key to
   `FACET_COLUMN`. This map is an allow-list (keys are fixed, never user input),
   so the column name is safe as an identifier while values stay bound
   parameters. Skip this for a `numericRange` facet, which filters through its
   own builder.

4. **Labels** (`frontend/domain/samples/facet-labels.ts`): add a `facetLabel`
   case (reuse a `sample_field_*` message where one exists, else a `facet_*`
   key). For a `hierarchy` or `enum` facet, add a `facetValueLabel` case
   resolving option codes; `text` and `numericRange` need none.

5. **i18n**: add any new `facet_*` keys to the message catalogs. Shared enum
   text lives in `domain`; app-only copy in the app catalog (see the i18n rule).

## Tests

Cover the new facet in three specs:

- `domain/sample/search/facets.spec.ts`: the drift-guard and value validation.
- `api/sample/service/list-sample.spec.ts`: the filter narrows results (real
  Postgres, see the `kysely-vitest-postgres` skill).
- `frontend/domain/samples/sample-facets.spec.tsx`: the sidebar renders and
  updates the URL.
