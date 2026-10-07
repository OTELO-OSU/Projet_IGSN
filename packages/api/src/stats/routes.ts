import type { StatsRepository } from "@projet-igsn/domain/stats/repository";
import type { StatsResponse } from "@projet-igsn/domain/stats/stats-validator";

import { Hono } from "hono";

export function createStatsRoutes(repository: StatsRepository) {
  return new Hono().get("/", async (c) => {
    const body: StatsResponse = { data: await repository.count() };
    return c.json(body);
  });
}
