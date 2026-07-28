import type { User } from "./model.ts";

// The token carries the whole user but not its local id, which the upsert
// resolves (or creates) by email.
export type UpsertUser = Omit<User, "id">;

export type UserRepository = {
  upsert(input: UpsertUser): Promise<User>;
};
