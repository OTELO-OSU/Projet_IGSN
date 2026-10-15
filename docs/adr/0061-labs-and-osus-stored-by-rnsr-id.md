# 0061. Labs and OSUs are stored by RNSR id, codes stay the outside contract

Date: 2026-10-13

## Status

Accepted.

## Context

A user, a sample, a managed group and a service account recorded a laboratory or OSU by its code.

Those codes change over time: a requalification (UPS2074 became UAR2074, UMI3376 became IRL3376) or a merger.

Each change needed a new catalog entry, plus either a data migration rewriting stored codes or a `replacedBy` widening.

Partners, public links and exports already name laboratories and OSUs by code.

## Decision

- Each laboratory and OSU in `laboratory.ts` and `osu.ts` carries an `id`, its RNSR national structure number (`199511994N`), or `local:<code>` when RNSR has none.
- The database stores that id in every institution column (`user`, `sample`, the managed-group tables), never a code.
- The api persistence layer is the single translation: `laboratoryCodeOf`/`osuCodeOf` on read, `laboratoryIdOf`/`osuIdOf` on write and in SQL filters.
- Every layer above it keeps speaking codes: domain, admin, frontend, the `/service` Core URNs (`urn:otelo:laboratory:UMR7590`), public search links, the data.gouv CSV, the xlsx template and admin links.
- A requalified code moves into the entry's `formerCodes`, and the entry takes the new `code`, its id unchanged.
- A former code is accepted wherever a code is, and resolves to the same entry.
- A successor RNSR records as a new structure is a new entry, the old one taking `replacedBy` (a laboratory id).
- The monthly `sync-rnsr.ts` applies both changes from RNSR; see `docs/sync-data.md`.

### Rejected

- Keeping codes in the database with a remap migration per change: every requalification costs a migration and a deploy, and a code missed in one stored column silently drops a user out of a manager's reach.
- Exposing RNSR ids outside the database: partners, links and exports already name codes, a `local:` id has no meaning outside, and researchers read codes, not structure numbers.

## Consequences

- A code change touches the catalog alone, the database never moving.
- A `local:<code>` id is never upgraded to an RNSR number later, so a stored id stays stable.
- No entry, former code, `replacedBy` or `organizationRors` link is ever removed, since stored ids and old codes must keep resolving.
- An unknown stored value passes through both helpers unchanged, so it shows rather than vanishing.
- The deploy cannot be rolled back without a database restore: the migration's `down` restores no code, so earlier code would read ids in every institution column.
