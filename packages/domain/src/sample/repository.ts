import type { UserSampleRole } from "../user-sample/model.ts";
import type {
  AdminSampleListItem,
  ListSamplesQuery,
} from "./sample-validator.ts";
import type { CreateSample, Sample } from "./sample.ts";

// The validated list query is the repository's param shape: page/perPage/sort/
// order/search, the bbox and every facet param (see sample/search/facets.ts).
// Reusing the inferred type keeps the repository in lockstep with the query
// schema.
export type ListSamplesParams = ListSamplesQuery;

export type ListSamplesResult = {
  data: Sample[];
  total: number;
};

export type AdminListSamplesResult = {
  data: AdminSampleListItem[];
  total: number;
};

// `userId` is a separate argument, never part of ListSamplesParams (the
// validated query): the caller's id comes from the token, never from the client.
export type SampleRepository = {
  list(
    params: ListSamplesParams,
    userId: string,
  ): Promise<AdminListSamplesResult>;
  listPublished(params: ListSamplesParams): Promise<ListSamplesResult>;
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
};
