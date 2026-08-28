import type { InstitutionalGroupRef } from "../institutional-group/model.ts";

export type OrphanedGroup =
  | { kind: "manual"; id: string; name: string }
  | (InstitutionalGroupRef & { name: string });
