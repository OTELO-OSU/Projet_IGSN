import type { ListSamplesQuery } from "./sample-validator.ts";
import type { CreateSample, Sample } from "./sample.ts";

// The validated list query is the repository's param shape: page/perPage/sort/
// order/search and every facet param (see sample/search/facets.ts). Reusing the
// inferred type keeps the repository in lockstep with the query schema.
export type ListSamplesParams = ListSamplesQuery;

export type ListSamplesResult = {
  data: Sample[];
  total: number;
};

export type SampleRepository = {
  list(params: ListSamplesParams): Promise<ListSamplesResult>;
  listPublished(params: ListSamplesParams): Promise<ListSamplesResult>;
  get(id: string): Promise<Sample | null>;
  getPublishedByIgsn(igsn: string): Promise<Sample | null>;
  create(input: CreateSample): Promise<Sample>;
  update(id: string, input: CreateSample): Promise<Sample | null>;
  publish(id: string): Promise<Sample | null>;
};
