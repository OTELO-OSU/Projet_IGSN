import type { MyServiceAccount, ServiceAccount } from "./model.ts";
import type {
  ListServiceAccountsQuery,
  ServiceAccountBody,
} from "./service-account-validator.ts";

export type ServiceAccountRepository = {
  list(
    query: ListServiceAccountsQuery,
  ): Promise<{ data: ServiceAccount[]; total: number }>;
  get(id: string): Promise<ServiceAccount>;
  create(body: ServiceAccountBody): Promise<ServiceAccount | "name_taken">;
  update(
    id: string,
    body: ServiceAccountBody,
  ): Promise<ServiceAccount | "name_taken">;
  remove(id: string): Promise<void>;
  listByOwner(ownerId: string): Promise<MyServiceAccount[]>;
  rotateApiKey(id: string, ownerId: string, hash: string): Promise<void>;
  findByApiKeyHash(hash: string): Promise<ServiceAccount | undefined>;
};
