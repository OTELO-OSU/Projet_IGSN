import type { CreateSample, Sample } from "./sample.ts";

export type ListSamplesParams = {
  page: number;
  perPage: number;
};

export type ListSamplesResult = {
  data: Sample[];
  total: number;
};

export type SampleRepository = {
  list(params: ListSamplesParams): Promise<ListSamplesResult>;
  create(input: CreateSample): Promise<Sample>;
};
