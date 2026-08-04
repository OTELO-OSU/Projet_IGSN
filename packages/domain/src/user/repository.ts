import type { User } from "./model.ts";

// The token carries the whole user but not its local id, which the upsert
// resolves (or creates) by email.
export type UpsertUser = Omit<User, "id">;

export type UserRepository = {
  upsert(input: UpsertUser): Promise<User>;
  // No query browses everyone. `callerId` comes from the token, never from
  // the client: nobody shares a sample with themself, so the caller is
  // always left out of the results.
  search(query: string | undefined, callerId: string): Promise<User[]>;
};
