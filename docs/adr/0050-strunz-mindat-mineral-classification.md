# 0050. Strunz-Mindat (2026) mineral classification

Date: 2026-09-24

## Status

Accepted.

## Context

A mineral sample (material at or under `rock_and_sediment.mineral`) lists 0..n classifications. Each row is a Strunz category, optionally a sub-category, optionally a Mindat mineral, with an optional abundance. The categories and sub-categories come from a geologist's spreadsheet, and the 6239 minerals from a Mindat export keyed by true Strunz sub-class (`9.E`).

## Decision

- A row is stored in a child table `mineral_classification`: `strunz_id` is an `ltree` holding the category or sub-category path of the deepest class picked, and `mindat_id` is a nullable integer set when a mineral is picked.
  - Form and hierarchy paths add a `mindat_<id>` leaf segment (`9.E.mindat_2815`), converted by `toMineralPath` / `fromMineralPath`; the prefix keeps `resolvePathNode`, which resolves by suffix, from hitting the category nodes `1`..`10`.
- Codes are the user's, overriding the `lower_snake_case` vocabulary convention: categories are `1`..`10`, and a sub-category is `<category>.<segment>`, rows regrouping several Strunz sub-classes taking a combined segment (`2.B-E`, `2.HJL-M`, `4.A-E`, `4.F-G`, `5.A-E`, `7.A-E`, `7.G-H`, `8.A-D`).
  - A mineral whose Mindat key no spreadsheet row covers (`X.0`, `2.K`) sits directly under its category (`9 > Chrysotile`), listed after the sub-categories.
  - Their message keys are `strunz_<id lowercased, "." and "-" as "_">`, and a label shows the name alone (`Phyllosilicates`), so the form search matches names, not codes.
- A mineral's `strunzCode` is `<its Mindat key>.<0-based index in that key's list>` (`9.E.161` for Muscovite), since the export carries no finer Strunz code.
- The catalog (`domain/sample/mineral/strunz-classification.ts`, spreading one `strunz-classification/*-subtree.ts` per category) was generated once: it is the source of truth, with no sync script, and a refresh is a reviewed edit of those files, each class node listing its minerals with their `strunzCode`.
- IGSN Core carries the rows as `extensions.geology.mineralogy`, a list of `strunz-mindat` concepts whose `id` is `strunz_id`, extended with `mindatId` and `abundance`, the `notation` being the mineral's `strunzCode`; an empty list emits nothing.

## Consequences

- The `strunzCode` indexes shift if a Mindat list is reordered, so a catalog refresh must keep each key's order or accept renumbered codes in DataCite and Core.
- The ~280 KB catalog ships with every package importing `sample.ts`, since the row schema checks a mineral against it.
- The public facet stops at sub-categories; filtering by a single mineral would need a second param.

## Rejected option

Store one path per row (`9.E.mindat_2815`) in a single `ltree` column. Rejected: it mixes a catalog foreign key into a vocabulary path, and every reader would re-parse the mineral id out of it.
