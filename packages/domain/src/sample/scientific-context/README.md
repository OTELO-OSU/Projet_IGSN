# Scientific context

Sample provenance: who collected a sample, in which programme or collection, and
how. `model.ts` is a discriminated union on `provenanceStatus`
(`recent_collection` or `historical_specimen`); the mandatory fields of each
branch are enforced at publish (see `../publication/sample-publish-blockers.ts`),
not in the schema, so a draft can hold just the status.

## Organizations list

`organization.ts` holds the reference list of research organizations, each with
its ROR identifier (Research Organization Registry). The funder organization and
the research structure fields store an organization by its ROR id; the id is the
stable code, `name`/`acronym` are display data (proper nouns, not translated).

- **Format**: `ORGANIZATIONS` is an array of `{ ror, name, acronym }`. `ror` is
  the bare ROR id (the `https://ror.org/` part stripped), `acronym` is `null`
  when the source has none. ROR ids must be unique.
- **Validation**: values are checked by ROR format (`organizationRorSchema`),
  not by membership, so the list can grow without rejecting stored values.

### Updating

The list comes from an internal Excel maintained by PY.

- **One-off change**: edit the `ORGANIZATIONS` array in `organization.ts`
  directly. Keep ROR ids unique.
- **Bulk refresh**: export the Excel to CSV (columns: id, name, acronym, ROR
  URL), then regenerate:

  ```sh
  pnpm -F @projet-igsn/domain generate-organizations path/to/orgs.csv
  pnpm fmt:apply packages/domain/src/sample/scientific-context/organization.ts
  ```

  The script (`scripts/generate-organizations.ts`) skips the header row, strips
  the `https://ror.org/` prefix, and drops rows whose ROR repeats an earlier one
  (the source list holds a few duplicates).
