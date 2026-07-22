import type { NumericUnit } from "./age/numeric-unit.ts";
import type { Bbox } from "./sample-validator.ts";
import type { CreateSample, Sample } from "./sample.ts";

export type ListSamplesParams = {
  page: number;
  perPage: number;
  sort?: "status";
  order?: "asc" | "desc";
  search?: string;
  ageMin?: number;
  ageMax?: number;
  ageUnit?: NumericUnit;
  bbox?: Bbox;
};

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
