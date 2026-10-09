import { canAddParent } from "@projet-igsn/domain/sample/parent/can-add-parent";
import { diffParentIds } from "@projet-igsn/domain/sample/parent/diff-parent-ids";
import { sampleParentSchema } from "@projet-igsn/domain/sample/parent/model";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { addParentOwnerAsContributor } from "./add-parent-owner-as-contributor.ts";
import { cascadeInheritedLocation } from "./cascade-inherited-location.ts";
import { deleteOrphanLocations } from "./delete-orphan-locations.ts";
import { findCyclicParentLinks } from "./find-cyclic-parent-links.ts";
import { inheritParentLocation } from "./inherit-parent-location.ts";
import { insertSampleParents } from "./insert-sample-parents.ts";
import { listDescendantIds } from "./list-descendant-ids.ts";
import { markForSynchronization } from "./mark-for-synchronization.ts";
import { sampleParentsQuery } from "./sample-children-query.ts";
import { writeSampleLocation } from "./write-sample-location.ts";

export const PARENTS_FROZEN = "A sample's parents cannot be removed";

export const PARENT_CYCLE = "A sample cannot descend from itself";

export const SECOND_PARENT_REFUSED =
  "A sample gains a parent only while it has none, one at a time";

export async function addSampleParents(
  db: Transactional<DB>,
  sampleId: string,
  submitted: readonly string[] | undefined,
): Promise<boolean> {
  const old = await db
    .selectFrom("sample")
    .select((eb) => [sampleParentsQuery(eb), "location_id", "igsn"])
    .where("id", "=", sampleId)
    .executeTakeFirstOrThrow();
  const stored = z.array(sampleParentSchema).parse(old.parents);
  const { added, removed } = diffParentIds(stored, submitted);
  if (removed.length > 0) {
    throw new HTTPException(422, { message: PARENTS_FROZEN });
  }
  const [parent, ...more] = added;
  if (parent === undefined) return false;
  if (!canAddParent(stored) || more.length > 0) {
    throw new HTTPException(422, { message: SECOND_PARENT_REFUSED });
  }
  // ponytail: no row lock, so two concurrent writes closing a cycle are not serialised; lock the lineage if editors ever race.
  const cyclic = findCyclicParentLinks(
    [{ childId: sampleId, parentIds: added }],
    await listDescendantIds(db, [sampleId]),
  );
  if (cyclic.length > 0) {
    throw new HTTPException(422, { message: PARENT_CYCLE });
  }
  await insertSampleParents(db, sampleId, added);
  const newLocationId = await inheritParentLocation(db, sampleId, parent);
  if (newLocationId === null) await writeSampleLocation(db, sampleId, null);
  await cascadeInheritedLocation(db, sampleId, old.location_id, newLocationId);
  if (old.location_id !== null) {
    await deleteOrphanLocations(db, old.location_id);
  }
  await addParentOwnerAsContributor(db, sampleId, added);
  if (old.igsn !== null) await markForSynchronization(db, [parent]);
  return true;
}
