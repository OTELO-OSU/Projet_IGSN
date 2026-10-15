# Importing a new institution export

The lists of laboratories and OSUs offered in the app come from a CSV export. Importing one is a single command, then a diff to review.

## 1. Put the four CSV files in `sync-data/`

At the repo root, named exactly as below. The folder is gitignored, so a fresh clone has none of them.

| file                                      | columns                                     |
| ----------------------------------------- | ------------------------------------------- |
| `institution_organisation.csv`            | `#ID`, `ror`                                |
| `institution_osu.csv`                     | `#ID`, `name`, `acronym`                    |
| `institution_laboratory.csv`              | `#ID`, `code`, `acronym`, `name`, `#osu_id` |
| `institution_organisation_laboratory.csv` | `#laboratory_id`, `#organization_id`        |

Columns are matched by name, so their order does not matter and extra ones are ignored.

The `#` columns are only used to match the files with each other, and none of them is imported:

- `#osu_id` in the laboratory file points at an `#ID` in the OSU file.
- `#laboratory_id` and `#organization_id` in the join file point at an `#ID` in the laboratory and organisation files.

An export row is matched to an entry of `laboratory.ts` or `osu.ts` by the laboratory's `code` or the OSU's `acronym`, so the ids may be renumbered between two exports without any consequence.

Each entry of `laboratory.ts` and `osu.ts` is keyed by an `id`, the key users and samples store in the database:

- A known entry is matched by its code or one of its `formerCodes`, and keeps its `id`.
- A new laboratory takes the RNSR number of the one RNSR record listing its code, fetched from RNSR at import time.
- A new OSU takes the RNSR number of its own support unit, or of the one RNSR record with its acronym.
- An entry RNSR does not match takes `local:<code>`, and a local id is never upgraded later, so a stored id stays stable.
- Two export rows sharing an RNSR id become one entry, the other code joining its `formerCodes`, reported as `merged <code> into <code>, same RNSR id`.
- An export row whose new code RNSR gives an existing entry's id renames that entry, the old code joining `formerCodes`, reported as `<code> is now <code>, same RNSR id`.

Three things the export must get right, or the import stops on the first one it meets:

- Every laboratory `code` and every OSU `acronym` is filled in and appears once.
- A field containing a comma, a quote or a line break is wrapped in `"..."`, with any quote inside it doubled (`""`).
- Every row has as many fields as the header.

## 2. Run the import

```
pnpm --filter @projet-igsn/domain sync-institutions
pnpm fmt:apply
```

It reports what it kept from the previous list (step 5) and each laboratory that moved OSU (step 6), then ends with a count of what it wrote, `wrote 142 laboratories and 26 OSUs`.

## 3. Read what it skipped

Incomplete rows are dropped rather than failing the import, and each one is reported. This is the only place a missing laboratory is explained.

| message                                                           | meaning                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `skipping organization <id> without a ROR`                        | no ROR in the export, so no laboratory can be attached to it            |
| `dropping laboratory <code> without a ROR`                        | none of its organismes survived, so the export's row is left out        |
| `laboratory <code> references unknown OSU <id>`                   | the laboratory is kept, without its OSU                                 |
| `laboratory <code> references <ror>, absent from organization.ts` | kept, but the organisme will show as a raw code until its own sync runs |

A laboratory can also lose an organisme with no message, when the export points at an organisme row that is not there.

## 4. Review the diff

`osu.ts` and `laboratory.ts` change, under `packages/domain/src/institutional-group/`. Read the diff as you would any other, then run:

```
pnpm lint:check
pnpm test --project @projet-igsn/domain --project @projet-igsn/admin
```

## 5. Nothing is ever removed

Users and samples keep the ids they hold, so every laboratory, OSU and organisme link stays resolvable.

- A laboratory or an OSU absent from the export is kept, reported as `kept <code>, absent from the export`.
- An organisme link absent from the export is kept too, reported as `kept link <code> -> <ror>, absent from the export`.
- A laboratory whose code changed under the same RNSR id keeps its entry, the old code joining `formerCodes`, and an old code still resolves everywhere.
- A laboratory RNSR records as a new structure (a merger or a renumbering) gets a new entry, and the old one takes `replacedBy: "<new id>"`.
- The import carries `replacedBy` over while the old code is still in the export.
- A replaced laboratory still resolves everywhere, but no form, picker or filter offers it as a new choice.
- A manager of the new code also reaches the users and samples holding the old one.

## 6. If a laboratory changed OSU

A laboratory has a single OSU, so the export wins, reported as `laboratory <code> moved from OSU <old> to <new>`.

Nothing revalidates a stored trio after login, the gate re-prompting on a `NULL` laboratory alone. So the users holding the old trio stay stuck: the app keeps letting them in, while their `/settings/groups` shows no laboratory and any save is rejected.

- Clear the three columns for the users of a laboratory that moved, with a migration in `packages/api/migrations/`.

## 7. The monthly RNSR sync

The `Sync institutions` GitHub workflow also runs `node packages/domain/scripts/sync-rnsr.ts` (`pnpm --filter @projet-igsn/domain sync-rnsr`), downloading the RNSR export once and matching each laboratory and OSU by `id`.

- A laboratory takes its RNSR name, unless `PINNED_LABORATORY_NAMES` in `packages/domain/scripts/pinned-rnsr-names.ts` keeps a curated one.
- A laboratory whose code RNSR no longer lists, with one listed code of the same number (UPS2074 to UAR2074), takes that code, the old one joining `formerCodes`.
- A laboratory whose id RNSR no longer lists, with one active record naming it in its history, gets that record as a new entry with its OSU and organismes, the old one taking `replacedBy`.
- Laboratories merged into one successor share that one new entry, with the union of their organismes.
- A requalified or successor code another entry already holds is left for a hand fix.
- It skips a replaced laboratory.
- An OSU takes its RNSR name, unless `PINNED_OSU_NAMES` in `packages/domain/scripts/pinned-rnsr-names.ts` keeps a curated one.
- RNSR names some OSUs after their support unit, and those are the pinned ones.
- An OSU's organismes become the union of its own and those of its laboratories.
- It never removes an entry, a former code or an organisme link.
- A CSV re-import (step 2) overwrites names, so the next RNSR sync proposes them again and a pinned laboratory keeps the export's name until it is fixed by hand.

It writes to stderr, the workflow's run log, and that is how an entry needing a hand fix is caught.

| message                                                           | meaning                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `laboratory <code> is now <code>`                                 | the code was requalified, the old one kept as a former code                                       |
| `laboratory <code> is listed as <codes> in RNSR`                  | no single code of the same number, so fix the code by hand                                        |
| `laboratory <code> is succeeded by <code>`                        | the successor was added and the laboratory marked replaced                                        |
| `laboratory <code> is succeeded by <code>, already listed`        | the successor is already in the catalog, so set `replacedBy` by hand                              |
| `laboratory <code> is not in RNSR`                                | no active record nor successor, expected for a `local:` id                                        |
| `laboratory <code> is split into <ids> in RNSR`                   | several successors, so add them by hand and pick one for `replacedBy`                             |
| `laboratory <code> is succeeded by <id>, without a code`          | the successor has no code in RNSR, so add it by hand                                              |
| `OSU <code> is renamed <name>`                                    | the OSU name changed                                                                              |
| `OSU <code> is not in RNSR`                                       | no record for its id, expected for a `local:` id                                                  |
| `laboratory <code> could become <code>, a code already listed`    | another entry holds that code, so fix the code by hand                                            |
| `laboratory <code> is succeeded by <code>, a code already listed` | another entry holds the successor's code, so add the successor by hand                            |
| `RNSR sync failed: <reason>`                                      | nothing was refreshed and the run fails, so rerun it or fix the script if RNSR changed its export |
