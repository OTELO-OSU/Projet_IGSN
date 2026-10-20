import type {
  AdminListSamplesResponse,
  ListSamplesQuery,
} from "@projet-igsn/domain/sample/sample-validator";

import { Hono } from "hono";

import type { SampleAdminDeps, SampleAdminEnv } from "./admin-routes.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { getModerationScope } from "../auth/moderation-scope.ts";
import { requireUserModeration } from "../auth/require-user-moderation.ts";
import { samplesExportResponse } from "./bulk-edit/export-workbook.ts";
import {
  validateCheckDuplicatesBody,
  validateExportBody,
  validateListQuery,
} from "./validator.ts";

type InstitutionalFacets =
  | "institutionalOrganization"
  | "institutionalOsu"
  | "institutionalLaboratory"
  | "bbox";

function adminListQuery<Query extends Partial<ListSamplesQuery>>({
  institutionalOrganization: _organization,
  institutionalOsu: _osu,
  institutionalLaboratory: _laboratory,
  bbox: _bbox,
  ...rest
}: Query): Omit<Query, InstitutionalFacets> {
  return rest;
}

export function createSampleListRoutes({ repository, users }: SampleAdminDeps) {
  return new Hono<SampleAdminEnv>()
    .get("/", validateListQuery, async (c) => {
      const { data, total } = await repository.listAssignedTo(
        adminListQuery(c.req.valid("query")),
        c.get("user").id,
      );
      const body: AdminListSamplesResponse = { data, meta: { total } };
      return c.json(body);
    })
    .get(
      "/moderated",
      requireUserModeration(users),
      validateListQuery,
      async (c) => {
        const { data, total } = await repository.listModerated(
          { ...adminListQuery(c.req.valid("query")), ownership: undefined },
          c.get("scope"),
        );
        const body: AdminListSamplesResponse = { data, meta: { total } };
        return c.json(body);
      },
    )
    .post("/duplicates", validateCheckDuplicatesBody, async (c) => {
      const { exclude, ...criteria } = c.req.valid("json");
      return c.json({
        data: await repository.findDuplicates(criteria, exclude),
      });
    })
    .post("/export", validateExportBody, async (c) => {
      const request = c.req.valid("json");
      const user = c.get("user");
      const { data } = await repository.listExportable(
        request.mode === "filters"
          ? { ...request, query: adminListQuery(request.query) }
          : request,
        user.id,
        request.moderated ? await getModerationScope(users, user) : null,
      );
      return samplesExportResponse(data);
    })
    .post("/retry-synchronization", requireActiveSession, async (c) =>
      c.json({
        count: await repository.retryFailedSynchronizations(c.get("user").id),
      }),
    );
}
