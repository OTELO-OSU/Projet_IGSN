import type { UserSampleRole } from "../user-sample/model.ts";
import type { SampleEditLock } from "./edit-lock.ts";
import type {
  AdminSampleListItem,
  ListSamplesQuery,
} from "./sample-validator.ts";
import type { CreateSample, Sample } from "./sample.ts";

export type ListSamplesResult = {
  data: Sample[];
  total: number;
};

export type AdminListSamplesResult = {
  data: AdminSampleListItem[];
  total: number;
};

// `userId` is a separate argument, never part of ListSamplesQuery (the
// validated query): the caller's id comes from the token, never from the client.
export type SampleRepository = {
  listAssignedTo(
    params: ListSamplesQuery,
    userId: string,
  ): Promise<AdminListSamplesResult>;
  listAllAsSuperAdmin(
    params: ListSamplesQuery,
  ): Promise<AdminListSamplesResult>;
  listPublished(params: ListSamplesQuery): Promise<ListSamplesResult>;
  // Reading a sample is relative to who reads it: no row at all (the api answers
  // 404) or the row plus this user's role on it (403 when they hold none).
  get(
    id: string,
    userId: string,
  ): Promise<{ sample: Sample; role: UserSampleRole | null } | null>;
  getPublishedByIgsn(igsn: string): Promise<Sample | null>;
  create(input: CreateSample, ownerId: string): Promise<Sample>;
  update(id: string, input: CreateSample): Promise<Sample | null>;
  publish(id: string): Promise<Sample | null>;
  // The live lock on the sample, `null` when it is free, expired, or unknown.
  // A lock is a claim on editing, never an authorization decision: who may edit
  // stays the role's call (see canUpdateSample).
  getEditLock(id: string): Promise<SampleEditLock | null>;
  // Claims the lock, or renews it when this user already holds it. Answers the
  // resulting live lock, whose `userId` says who won.
  acquireEditLock(id: string, userId: string): Promise<SampleEditLock | null>;
  // Idempotent, and only ever releases this user's own claim.
  releaseEditLock(id: string, userId: string): Promise<void>;
};
