import type { Kysely } from "kysely";

import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { sql } from "kysely";

import type { DB } from "../src/db.ts";
import type { CreatedSample, OwnedSampleRow } from "./seed-sample-row.ts";

import { storedInstitutions } from "../src/institutional-group/stored-institution.ts";
import { deleteOrphanLocations } from "../src/sample/service/delete-orphan-locations.ts";
import { replaceLocationVerticalPositions } from "../src/sample/service/replace-location-vertical-positions.ts";
import { sampleColumns } from "../src/sample/service/sample-columns.ts";
import {
  hasLocationData,
  locationColumns,
} from "../src/sample/service/to-location.ts";
import { parseSampleRow } from "./seed-sample-row.ts";

const SEED_DOI_PREFIX = "10.70113";

export async function insertSamples(
  db: Kysely<DB>,
  rows: OwnedSampleRow[],
): Promise<CreatedSample[]> {
  const parsed = rows.map(({ owner, collaborators, ...row }) => ({
    ...parseSampleRow(row),
    owner,
    collaborators,
  }));
  await deleteOrphanLocations(db);
  const locations = parsed.flatMap(({ id, location }) => {
    const columns = locationColumns(location);
    return hasLocationData(columns) ? [{ id, ...columns }] : [];
  });
  if (locations.length > 0) {
    await db.insertInto("location").values(locations).execute();
  }
  for (const { id, location } of parsed)
    if (location?.verticalPositions?.length)
      await replaceLocationVerticalPositions(
        db,
        id,
        location.verticalPositions,
      );
  const located = new Set(locations.map((location) => location.id));
  const created = await db
    .insertInto("sample")
    .values(
      parsed.map(
        ({
          owner,
          collaborators: _collaborators,
          id,
          igsn,
          status,
          synchronizationStatus,
          synchronizationError,
          existingBlockers: _existingBlockers,
          ...create
        }) => {
          const permanent = hasPermanentIgsn({ status });
          const stored = storedInstitutions(owner);
          return {
            id,
            status,
            synchronization_status:
              synchronizationStatus ?? (permanent ? "synced" : null),
            synchronization_error: synchronizationError ?? null,
            igsn: igsn ?? null,
            location_id: located.has(id) ? id : null,
            doi_prefix: permanent ? SEED_DOI_PREFIX : null,
            published_at: permanent ? sql`now()` : null,
            internal_number: permanent
              ? sql<number>`nextval('sample_internal_number_seq')`
              : null,
            ...sampleColumns({ ...create, type: create.type ?? null }),
            institutional_organization: owner.institutionalOrganization,
            institutional_osu: stored.institutionalOsu,
            institutional_laboratory: stored.institutionalLaboratory,
          };
        },
      ),
    )
    .returning(["id", "name", "specific_name", "nature", "igsn", "status"])
    .execute();

  await db
    .insertInto("user_sample")
    .values(
      parsed.flatMap((row) => [
        { sample_id: row.id, user_id: row.owner.id, role: "owner" as const },
        ...(row.collaborators ?? []).map(({ userId, role }) => ({
          sample_id: row.id,
          user_id: userId,
          role,
        })),
      ]),
    )
    .execute();

  const attached = parsed.flatMap((row) =>
    row.owner.manualGroups.map((group_id) => ({
      sample_id: row.id,
      group_id,
    })),
  );
  if (attached.length > 0) {
    await db.insertInto("sample_manual_group").values(attached).execute();
  }

  return created;
}
