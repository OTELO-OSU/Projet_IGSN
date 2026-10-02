import type { InstitutionalGroups } from "../institutional-group/model.ts";
import type { CreateSample } from "../sample/sample.ts";
import type { SampleBatch } from "./model.ts";

export type SampleBatchItemWrite = { partnerId: string } & (
  | { create: CreateSample }
  | { update: { id: string; input: CreateSample } }
);

export type SampleBatchRepository = {
  create(batch: {
    serviceAccountId: string;
    ownerId: string;
    groups: InstitutionalGroups;
    items: SampleBatchItemWrite[];
  }): Promise<string>;
  get(id: string, serviceAccountId: string): Promise<SampleBatch | null>;
};
