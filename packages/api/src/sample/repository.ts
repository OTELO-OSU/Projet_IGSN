import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { Kysely, Transaction } from "kysely";

import type { DB } from "../db.ts";

import { type Transactional, withTransaction } from "../transaction.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { acquireEditLock } from "./service/acquire-edit-lock.ts";
import { addParentOwnerAsContributor } from "./service/add-parent-owner-as-contributor.ts";
import { deleteSample } from "./service/delete-sample.ts";
import { getEditLock } from "./service/get-edit-lock.ts";
import { getPublicSampleByIgsn } from "./service/get-public-sample-by-igsn.ts";
import { getSampleById } from "./service/get-sample-by-id.ts";
import { getSample } from "./service/get-sample.ts";
import { insertSampleRows } from "./service/insert-sample.ts";
import { isSampleModerated } from "./service/is-sample-moderated.ts";
import {
  listModeratedSamples,
  listPublishedSamples,
  listPublishedSamplesForService,
  listSamplesAssignedTo,
} from "./service/list-sample.ts";
import { publishSample } from "./service/publish-sample.ts";
import { releaseEditLock } from "./service/release-edit-lock.ts";
import { searchEligibleParents } from "./service/search-eligible-parents.ts";
import { setSampleStatus } from "./service/set-sample-status.ts";
import { updateSample } from "./service/update-sample.ts";

async function insertOwnedSample(
  trx: Transactional<DB>,
  input: CreateSample,
  ownerId: string,
  groups: InstitutionalGroups,
): Promise<string> {
  const id = await insertSampleRows(trx, input, groups);
  await insertSampleOwner(trx, id, ownerId);
  await addParentOwnerAsContributor(trx, id, input.parentIds ?? []);
  return id;
}

export function createSampleRepository(db: Kysely<DB>): SampleRepository {
  const tx =
    <A extends unknown[], R>(
      fn: (trx: Transaction<DB>, ...args: A) => Promise<R>,
    ) =>
    (...args: A) =>
      withTransaction(db, (trx) => fn(trx, ...args));
  return {
    listAssignedTo: tx(listSamplesAssignedTo),
    listModerated: tx(listModeratedSamples),
    listPublishedForService: tx(listPublishedSamplesForService),
    searchEligibleParents: tx(searchEligibleParents),
    isModerated: tx(isSampleModerated),
    listPublished: tx(listPublishedSamples),
    get: tx(getSample),
    getPublicByIgsn: tx(getPublicSampleByIgsn),
    create: (input, owner) =>
      withTransaction(db, async (trx) =>
        getSampleById(
          trx,
          await insertOwnedSample(trx, input, owner.id, owner),
        ),
      ),
    createPublished: (input, ownerId, groups) =>
      withTransaction(db, async (trx) => {
        const id = await insertOwnedSample(trx, input, ownerId, groups);
        const published = await publishSample(trx, id);
        if (!published) throw new Error("Sample vanished before publish");
        return published;
      }),
    update: tx(updateSample),
    publish: tx(publishSample),
    setStatus: tx(setSampleStatus),
    remove: tx(deleteSample),
    getEditLock: tx(getEditLock),
    acquireEditLock: tx(acquireEditLock),
    releaseEditLock: tx(releaseEditLock),
  };
}
