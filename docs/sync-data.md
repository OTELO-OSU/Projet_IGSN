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

What is stored instead is the laboratory's `code` and the OSU's `acronym`, so the ids may be renumbered between two exports without any consequence.

Three things the export must get right, or the import stops on the first one it meets:

- Every laboratory `code` and every OSU `acronym` is filled in and appears once.
- A field containing a comma, a quote or a line break is wrapped in `"..."`, with any quote inside it doubled (`""`).
- Every row has as many fields as the header.

## 2. Run the import

```
pnpm --filter @projet-igsn/domain sync-institutions
pnpm fmt:apply
```

It ends with a count of what it wrote, `wrote 142 laboratories and 26 OSUs`, then the dropped codes of step 5, if any.

## 3. Read what it skipped

Incomplete rows are dropped rather than failing the import, and each one is reported. This is the only place a missing laboratory is explained.

| message                                                           | meaning                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `skipping organization <id> without a ROR`                        | no ROR in the export, so no laboratory can be attached to it            |
| `dropping laboratory <code> without a ROR`                        | none of its organismes survived, so the laboratory is left out          |
| `laboratory <code> references unknown OSU <id>`                   | the laboratory is kept, without its OSU                                 |
| `laboratory <code> references <ror>, absent from organization.ts` | kept, but the organisme will show as a raw code until its own sync runs |

A laboratory can also lose an organisme with no message, when the export points at an organisme row that is not there.

## 4. Review the diff

`osu.ts` and `laboratory.ts` change, under `packages/domain/src/institutional-group/`, plus the migration of step 5 when a code disappeared. Read the diff as you would any other, then run:

```
pnpm lint:check
pnpm test --project @projet-igsn/domain --project @projet-igsn/admin
```

## 5. If a laboratory or an OSU disappeared

A dropped code stays on users and samples, in `institutional_organization`, `institutional_osu` and `institutional_laboratory`, on the `user` and `sample` tables both.

- The import writes the migration clearing it in both tables, `packages/api/migrations/<stamp>-clear-removed-institutions.ts`, and names the codes on stderr.
- A dropped laboratory clears the three columns, the trio being validated together, so the user picks a group again at their next login.
- A dropped OSU clears `institutional_osu` alone, since no OSU means any laboratory of the organisme.
- Review that migration with the diff, then apply it with `pnpm -F @projet-igsn/api migrate`.
- A renamed code reads as a drop, so turn its clearing into a remap, as [the migration of the first real import](../packages/api/migrations/20260812133605-move-institutional-groups-to-otelo.ts) does.
- Tests and the dev seed hardcode codes too, so run `pnpm test` and `make test-e2e`.

## 6. If a laboratory changed organisme or OSU

Only a code that disappeared gets a migration, and nothing revalidates a stored trio after login, the gate re-prompting on a `NULL` laboratory alone. So a laboratory that moved leaves the users holding its old trio stuck: the app keeps letting them in, while their `/settings` shows no laboratory and any save is rejected.

- Read the `osu` and `organizationRors` changes in the step 4 diff, then clear the three columns for the users of a laboratory that moved, the same way the generated migration does for a dropped one.
