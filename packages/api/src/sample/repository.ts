import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Kysely } from "kysely";

import type { DataCiteConfig } from "../datacite/config.ts";
import type { DB } from "../db.ts";

import { stagedUploadPathOf } from "../staged-upload/staged-path.ts";
import { consumeStagedUploads } from "../staged-upload/staged-uploads.ts";
import { transactionally, withTransaction } from "../transaction.ts";
import { acquireEditLock } from "./service/acquire-edit-lock.ts";
import { countPublishedFacets } from "./service/count-facets.ts";
import { deleteSample } from "./service/delete-sample.ts";
import {
  findBatchDuplicateSamples,
  findDuplicateSamples,
  findDuplicateSamplesOfEach,
} from "./service/find-duplicate-samples.ts";
import { getEditLock } from "./service/get-edit-lock.ts";
import { getPublicSampleByIgsn } from "./service/get-public-sample-by-igsn.ts";
import { getSampleById } from "./service/get-sample-by-id.ts";
import { getSampleLineage } from "./service/get-sample-lineage.ts";
import { getSample } from "./service/get-sample.ts";
import { insertOwnedSample } from "./service/insert-owned-sample.ts";
import { insertSampleAttachment } from "./service/insert-sample-attachment.ts";
import { isSampleModerated } from "./service/is-sample-moderated.ts";
import { listDescendantIds } from "./service/list-descendant-ids.ts";
import { listPublishedSamplesByIgsns } from "./service/list-published-samples-by-igsns.ts";
import {
  listExportableSamples,
  listModeratedSamples,
  listPublishedSamples,
  listPublishedSamplesForService,
  listSamplesAssignedTo,
} from "./service/list-sample.ts";
import { listSamplesByInternalNumbers } from "./service/list-samples-by-internal-numbers.ts";
import {
  listPublicSeriesLinkCandidatesByIgsns,
  listSeriesLinkCandidates,
} from "./service/list-series-link-candidates.ts";
import { mapPublishedSamples } from "./service/map-sample.ts";
import { publishSample } from "./service/publish-sample.ts";
import {
  insertQueuedSample,
  updateUnchangedSample,
} from "./service/queue-publication.ts";
import { releaseEditLock } from "./service/release-edit-lock.ts";
import { reserveInternalNumbers } from "./service/reserve-internal-numbers.ts";
import { searchEligibleChildren } from "./service/search-eligible-children.ts";
import { searchEligibleParents } from "./service/search-eligible-parents.ts";
import { setSampleStatus } from "./service/set-sample-status.ts";
import { unavailableInternalNumbers } from "./service/unavailable-internal-numbers.ts";
import { updateSample } from "./service/update-sample.ts";

export function createSampleRepository(
  db: Kysely<DB>,
  attachmentsDir: string,
  dataCite: DataCiteConfig | null = null,
): SampleRepository {
  const tx = transactionally(db);
  return {
    listAssignedTo: tx(listSamplesAssignedTo),
    listModerated: tx(listModeratedSamples),
    listPublishedForService: tx(listPublishedSamplesForService),
    searchEligibleParents: tx(searchEligibleParents),
    searchEligibleChildren: tx(searchEligibleChildren),
    isModerated: tx(isSampleModerated),
    listPublished: tx(listPublishedSamples),
    mapPublished: tx(mapPublishedSamples),
    countPublishedFacets: tx(countPublishedFacets),
    listExportable: tx(listExportableSamples),
    get: tx(getSample),
    getPublicByIgsn: tx(getPublicSampleByIgsn),
    listPublishedByIgsns: tx(listPublishedSamplesByIgsns),
    listSeriesLinkCandidates: tx(listSeriesLinkCandidates),
    listPublicSeriesLinkCandidatesByIgsns: tx(
      listPublicSeriesLinkCandidatesByIgsns,
    ),
    findDuplicates: tx(findDuplicateSamples),
    findDuplicatesOfEach: tx(findDuplicateSamplesOfEach),
    findBatchDuplicates: tx(findBatchDuplicateSamples),
    getPublicLineage: tx(getSampleLineage),
    listDescendantIds: tx(listDescendantIds),
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
          const id = await insertQueuedSample(
            trx,
            input,
            owner.id,
            owner,
            internalNumber,
          );
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
        for (const { id, input, updatedAt } of samples) {
          await updateUnchangedSample(trx, id, input, updatedAt);
        }
        return samples.length;
      }),
    retryFailedSynchronizations: (userId) =>
      withTransaction(db, async (trx) => {
        const { numUpdatedRows } = await trx
          .updateTable("sample")
          .set({ synchronization_status: "pending" })
          .where("synchronization_status", "=", "failed")
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
    update: tx(updateSample),
    publish: (id, status, publishedAt) =>
      withTransaction(db, (trx) =>
        publishSample(trx, id, status, dataCite, publishedAt),
      ),
    setStatus: tx(setSampleStatus),
    listDueEmbargoes: tx(async (trx, now: Date) => {
      const rows = await trx
        .selectFrom("sample")
        .select("id")
        .where("status", "=", "embargo")
        .where("published_at", "<=", now)
        .orderBy("id")
        .execute();
      return rows.map(({ id }) => id);
    }),
    remove: tx(deleteSample),
    getEditLock: tx(getEditLock),
    acquireEditLock: tx(acquireEditLock),
    releaseEditLock: tx(releaseEditLock),
    reserveInternalNumbers: tx(reserveInternalNumbers),
    unavailableInternalNumbers: tx(unavailableInternalNumbers),
  };
}
