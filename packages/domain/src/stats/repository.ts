import type { Stats } from "./model.ts";

export type StatsRepository = {
  count(): Promise<Stats>;
};
