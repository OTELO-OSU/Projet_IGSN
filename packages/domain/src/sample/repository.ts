import type { ListSamplesQuery } from "./sample-validator.ts";
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

// What a user may do with a sample id: it does not exist, it exists but belongs
// to someone else, or they own it. Keeping the first two apart is what lets the
// api answer 404 for an unknown id and 403 for another owner's sample.
export type SampleAccess = "missing" | "forbidden" | "owner";

// `ownerId` is a separate argument, never part of ListSamplesParams (the
// validated query): the caller's id comes from the token, never from the client.
export type SampleRepository = {
  list(params: ListSamplesParams, ownerId: string): Promise<ListSamplesResult>;
  listPublished(params: ListSamplesParams): Promise<ListSamplesResult>;
  get(id: string): Promise<Sample | null>;
  getPublishedByIgsn(igsn: string): Promise<Sample | null>;
  getSampleAccess(id: string, userId: string): Promise<SampleAccess>;
  create(input: CreateSample, ownerId: string): Promise<Sample>;
  update(id: string, input: CreateSample): Promise<Sample | null>;
  publish(id: string): Promise<Sample | null>;
};
