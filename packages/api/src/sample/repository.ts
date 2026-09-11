import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

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
  return {
    listAssignedTo: (params, userId) =>
      withTransaction(db, (trx) => listSamplesAssignedTo(trx, params, userId)),
    listModerated: (params, scope) =>
      withTransaction(db, (trx) => listModeratedSamples(trx, params, scope)),
    listPublishedForService: (params, scope, editableOnly) =>
      withTransaction(db, (trx) =>
        listPublishedSamplesForService(trx, params, scope, editableOnly),
      ),
    isModerated: (id, scope) =>
      withTransaction(db, (trx) => isSampleModerated(trx, id, scope)),
    listPublished: (params) =>
      withTransaction(db, (trx) => listPublishedSamples(trx, params)),
    get: (id, userId) =>
      withTransaction(db, (trx) => getSample(trx, id, userId)),
    getPublicByIgsn: (igsn) =>
      withTransaction(db, (trx) => getPublicSampleByIgsn(trx, igsn)),
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
    update: (id, input) =>
      withTransaction(db, (trx) => updateSample(trx, id, input)),
    publish: (id, status) =>
      withTransaction(db, (trx) => publishSample(trx, id, status)),
    setStatus: (id, status) =>
      withTransaction(db, (trx) => setSampleStatus(trx, id, status)),
    remove: (id) => withTransaction(db, (trx) => deleteSample(trx, id)),
    getEditLock: (id) => withTransaction(db, (trx) => getEditLock(trx, id)),
    acquireEditLock: (id, userId) =>
      withTransaction(db, (trx) => acquireEditLock(trx, id, userId)),
    releaseEditLock: (id, userId) =>
      withTransaction(db, (trx) => releaseEditLock(trx, id, userId)),
  };
}
