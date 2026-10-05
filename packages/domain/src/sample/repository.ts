import type { InstitutionalGroups } from "../institutional-group/model.ts";
import type { BatchSuspectedDuplicate } from "../sample-batch/model.ts";
import type { UserSampleRole } from "../user-sample/model.ts";
import type { User } from "../user/model.ts";
import type { ModerationScope } from "../user/moderation-scope.ts";
import type { CreateSampleAttachment } from "./attachment/repository.ts";
import type { SampleEditLock } from "./edit-lock.ts";
import type { ExportSamplesRequest } from "./export/export-validator.ts";
import type { SampleLineage } from "./lineage/model.ts";
import type { SampleMapQuery, SampleMapResponse } from "./map/model.ts";
import type { SampleParent } from "./parent/model.ts";
import type {
  DuplicateCriteria,
  SuspectedDuplicate,
} from "./publication/suspected-duplicate.ts";
import type {
  AdminSampleListItem,
  ListSamplesQuery,
  PublishStatus,
  SampleFacetCounts,
  SearchEligibleParentsQuery,
  SetSampleStatusBody,
} from "./sample-validator.ts";
import type { CreateSample, Sample, SampleStatus } from "./sample.ts";

export type ListSamplesResult = {
  data: Sample[];
  total: number;
};

export type AdminListSamplesResult = {
  data: AdminSampleListItem[];
  total: number;
};

export type ImportedSample = {
  input: CreateSample;
  internalNumber: number | null;
  attachments: { input: CreateSampleAttachment; stagedId: string }[];
};

export type SampleRepository = {
  listAssignedTo(
    params: ListSamplesQuery,
    userId: string,
  ): Promise<AdminListSamplesResult>;
  listModerated(
    params: ListSamplesQuery,
    scope: ModerationScope,
  ): Promise<AdminListSamplesResult>;
  listPublishedForService(
    params: ListSamplesQuery,
    scope: ModerationScope,
    editableOnly: boolean,
  ): Promise<AdminListSamplesResult>;
  isModerated(id: string, scope: ModerationScope): Promise<boolean>;
  searchEligibleParents(
    params: SearchEligibleParentsQuery,
    userId: string,
    scope: ModerationScope | null,
  ): Promise<SampleParent[]>;
  listPublished(params: ListSamplesQuery): Promise<ListSamplesResult>;
  mapPublished(query: SampleMapQuery): Promise<SampleMapResponse>;
  countPublishedFacets(params: ListSamplesQuery): Promise<SampleFacetCounts>;
  listExportable(
    request: ExportSamplesRequest,
    userId: string,
    scope: ModerationScope | null,
  ): Promise<ListSamplesResult>;
  get(
    id: string,
    userId: string,
  ): Promise<{ sample: Sample; role: UserSampleRole | null } | null>;
  getPublicByIgsn(igsn: string): Promise<Sample | null>;
  findDuplicates(
    criteria: DuplicateCriteria,
    exclude?: string,
  ): Promise<SuspectedDuplicate[]>;
  findDuplicatesOfEach(
    criteria: readonly DuplicateCriteria[],
  ): Promise<SuspectedDuplicate[][]>;
  findBatchDuplicates(
    criteria: DuplicateCriteria,
    exclude?: string,
  ): Promise<BatchSuspectedDuplicate[]>;
  findStatusByIgsn(igsn: string): Promise<SampleStatus | null>;
  getPublicLineage(igsn: string): Promise<SampleLineage | null>;
  create(input: CreateSample, owner: User): Promise<Sample>;
  createPublishing(samples: ImportedSample[], owner: User): Promise<number>;
  listByInternalNumbers(
    numbers: number[],
    userId: string,
  ): Promise<{ sample: Sample; role: UserSampleRole | null }[]>;
  updatePublishing(
    samples: { id: string; input: CreateSample; updatedAt: Date }[],
  ): Promise<number>;
  retryFailedPublications(userId: string): Promise<number>;
  createPublished(
    input: CreateSample,
    ownerId: string,
    groups: InstitutionalGroups,
  ): Promise<Sample>;
  update(id: string, input: CreateSample): Promise<Sample | null>;
  /** `withdrawn` mints the IGSN while keeping the sample out of public view. */
  publish(id: string, status: PublishStatus): Promise<Sample | null>;
  setStatus(
    id: string,
    status: SetSampleStatusBody["status"],
  ): Promise<Sample | null>;
  remove(id: string): Promise<void>;
  getEditLock(id: string): Promise<SampleEditLock | null>;
  acquireEditLock(id: string, userId: string): Promise<SampleEditLock | null>;
  releaseEditLock(id: string, userId: string): Promise<void>;
  reserveInternalNumbers(count: number): Promise<number[]>;
  unavailableInternalNumbers(numbers: number[]): Promise<Set<number>>;
};
