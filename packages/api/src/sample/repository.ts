import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import type { DataCiteConfig } from "../datacite/config.ts";
import type { DB } from "../db.ts";

import { syncDoi } from "../datacite/sync-doi.ts";
import { stagedUploadPathOf } from "../staged-upload/staged-path.ts";
import { consumeStagedUploads } from "../staged-upload/staged-uploads.ts";
import {
  type Transactional,
  transactionally,
  withTransaction,
} from "../transaction.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { acquireEditLock } from "./service/acquire-edit-lock.ts";
import { addParentOwnerAsContributor } from "./service/add-parent-owner-as-contributor.ts";
import { countPublishedFacets } from "./service/count-facets.ts";
import { deleteSample } from "./service/delete-sample.ts";
import {
  findDuplicateSamples,
  findDuplicateSamplesOfEach,
} from "./service/find-duplicate-samples.ts";
import { getEditLock } from "./service/get-edit-lock.ts";
import { getPublicSampleByIgsn } from "./service/get-public-sample-by-igsn.ts";
import { getSampleById } from "./service/get-sample-by-id.ts";
import { getSampleLineage } from "./service/get-sample-lineage.ts";
import { getSample } from "./service/get-sample.ts";
import { insertSampleAttachment } from "./service/insert-sample-attachment.ts";
import { insertSampleRows } from "./service/insert-sample.ts";
import { isSampleModerated } from "./service/is-sample-moderated.ts";
import {
  listExportableSamples,
  listModeratedSamples,
  listPublishedSamples,
  listPublishedSamplesForService,
  listSamplesAssignedTo,
} from "./service/list-sample.ts";
import { listSamplesByInternalNumbers } from "./service/list-samples-by-internal-numbers.ts";
import { mapPublishedSamples } from "./service/map-sample.ts";
import { publishSample } from "./service/publish-sample.ts";
import { releaseEditLock } from "./service/release-edit-lock.ts";
import { reserveInternalNumbers } from "./service/reserve-internal-numbers.ts";
import { searchEligibleParents } from "./service/search-eligible-parents.ts";
import { setSampleStatus } from "./service/set-sample-status.ts";
import { unavailableInternalNumbers } from "./service/unavailable-internal-numbers.ts";
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

export function createSampleRepository(
  db: Kysely<DB>,
  attachmentsDir: string,
  dataCite: DataCiteConfig | null = null,
): SampleRepository {
  const tx = transactionally(db);
  const synced =
    <A extends unknown[]>(
      write: (trx: Transactional<DB>, ...args: A) => Promise<Sample | null>,
    ) =>
    (...args: A): Promise<Sample | null> =>
      withTransaction(db, async (trx) => {
        const sample = await write(trx, ...args);
        if (sample) await syncDoi(dataCite, sample);
        return sample;
      });
  return {
    listAssignedTo: tx(listSamplesAssignedTo),
    listModerated: tx(listModeratedSamples),
    listPublishedForService: tx(listPublishedSamplesForService),
    searchEligibleParents: tx(searchEligibleParents),
    isModerated: tx(isSampleModerated),
    listPublished: tx(listPublishedSamples),
    mapPublished: tx(mapPublishedSamples),
    countPublishedFacets: tx(countPublishedFacets),
    listExportable: tx(listExportableSamples),
    get: tx(getSample),
    getPublicByIgsn: tx(getPublicSampleByIgsn),
    findDuplicates: tx(findDuplicateSamples),
    findDuplicatesOfEach: tx(findDuplicateSamplesOfEach),
    getPublicLineage: tx(getSampleLineage),
    create: (input, owner) =>
      withTransaction(db, async (trx) =>
        getSampleById(
          trx,
          await insertOwnedSample(trx, input, owner.id, owner),
        ),
      ),
    createPublishing: async (samples, owner) => {
      const count = await withTransaction(db, async (trx) => {
        for (const { input, internalNumber, attachments } of samples) {
          const id = await insertOwnedSample(trx, input, owner.id, owner);
          await trx
            .updateTable("sample")
            .set({ status: "publishing", internal_number: internalNumber })
            .where("id", "=", id)
            .execute();
          for (const attachment of attachments)
            await insertSampleAttachment(
              trx,
              attachmentsDir,
              id,
              attachment.input,
              { from: stagedUploadPathOf(attachmentsDir, attachment.stagedId) },
            );
        }
        return samples.length;
      });
      await consumeStagedUploads(
        attachmentsDir,
        samples.flatMap(({ attachments }) =>
          attachments.map(({ stagedId }) => stagedId),
        ),
      );
      return count;
    },
    listByInternalNumbers: tx(listSamplesByInternalNumbers),
    updatePublishing: (samples) =>
      withTransaction(db, async (trx) => {
        for (const { id, input } of samples) {
          await updateSample(trx, id, input);
          await trx
            .updateTable("sample")
            .set({ status: "publishing" })
            .where("id", "=", id)
            .execute();
        }
        return samples.length;
      }),
    retryFailedPublications: (userId) =>
      withTransaction(db, async (trx) => {
        const { numUpdatedRows } = await trx
          .updateTable("sample")
          .set({ status: "publishing" })
          .where("status", "=", "publish_failed")
          .where((eb) =>
            eb.exists(
              eb
                .selectFrom("user_sample")
                .select("user_sample.sample_id")
                .whereRef("user_sample.sample_id", "=", "sample.id")
                .where("user_sample.user_id", "=", userId)
                .where("user_sample.role", "in", ["owner", "editor"]),
            ),
          )
          .executeTakeFirst();
        return Number(numUpdatedRows);
      }),
    createPublished: (input, ownerId, groups) =>
      withTransaction(db, async (trx) => {
        const id = await insertOwnedSample(trx, input, ownerId, groups);
        const published = await publishSample(trx, id, "published", dataCite);
        if (!published) throw new Error("Sample vanished before publish");
        return published;
      }),
    update: synced(updateSample),
    publish: (id, status) =>
      withTransaction(db, (trx) => publishSample(trx, id, status, dataCite)),
    setStatus: synced(setSampleStatus),
    remove: tx(deleteSample),
    getEditLock: tx(getEditLock),
    acquireEditLock: tx(acquireEditLock),
    releaseEditLock: tx(releaseEditLock),
    reserveInternalNumbers: tx(reserveInternalNumbers),
    unavailableInternalNumbers: tx(unavailableInternalNumbers),
  };
}
