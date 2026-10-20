import type { OpenAPIHono } from "@hono/zod-openapi";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";

import { createRoute } from "@hono/zod-openapi";
import { filterOrganizationsWithLaboratory } from "@projet-igsn/domain/institutional-group/filter-organizations-with-laboratory";
import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { OSUS } from "@projet-igsn/domain/institutional-group/osu";
import { z } from "zod";

import type { ServiceEnv } from "../auth/require-service-account.ts";

import {
  FAILED,
  FORBIDDEN_READ,
  OPTIONAL_SECURITY,
  THROTTLED,
  json,
} from "./service-route-definitions.ts";

const TAGS = ["Groups"];

const nameSchema = z.string().meta({ description: "Name of the group." });

const listResponseSchema = <Item extends z.ZodType>(
  item: Item,
  description: string,
  id: string,
) => z.strictObject({ data: z.array(item).meta({ description }) }).meta({ id });

const manualGroupListResponseSchema = listResponseSchema(
  z.strictObject({
    id: z.uuid().meta({
      description: "Id of the group, the value the manualGroup filter takes.",
    }),
    name: nameSchema,
  }),
  "Every manual group holding a published sample, by name.",
  "ManualGroupList",
);

const organizationListResponseSchema = listResponseSchema(
  z.strictObject({
    ror: z.string().meta({
      description:
        "ROR id of the organization, the value the affiliationOrganization filter takes.",
    }),
    name: nameSchema,
  }),
  "Every organization holding a laboratory.",
  "OrganizationList",
);

const osuListResponseSchema = listResponseSchema(
  z.strictObject({
    code: z.string().meta({
      description:
        "Code of the OSU, the value the affiliationOsu filter takes.",
    }),
    name: nameSchema,
  }),
  "Every OSU.",
  "OsuList",
);

const laboratoryListResponseSchema = listResponseSchema(
  z.strictObject({
    code: z.string().meta({
      description:
        "Code of the laboratory, the value the affiliationLaboratory filter takes.",
    }),
    name: nameSchema,
  }),
  "Every laboratory, a replaced one included.",
  "LaboratoryList",
);

const listRoute = <Schema extends z.ZodType>(
  path: string,
  summary: string,
  description: string,
  schema: Schema,
) =>
  createRoute({
    method: "get",
    path,
    tags: TAGS,
    summary,
    description: `${description} Anyone may call it.`,
    security: OPTIONAL_SECURITY,
    responses: {
      200: json(schema, summary),
      403: FORBIDDEN_READ,
      429: THROTTLED,
      500: FAILED,
    },
  });

const listManualGroupsRoute = listRoute(
  "/manual-groups",
  "List the manual groups",
  "Lists every manual group holding a published sample, whose id the manualGroup filter of GET /service/samples takes.",
  manualGroupListResponseSchema,
);

const listOrganizationsRoute = listRoute(
  "/organizations",
  "List the organizations",
  "Lists every organization holding a laboratory, whose ROR id the affiliationOrganization filter of GET /service/samples takes.",
  organizationListResponseSchema,
);

const listOsusRoute = listRoute(
  "/osus",
  "List the OSUs",
  "Lists every OSU, whose code the affiliationOsu filter of GET /service/samples takes.",
  osuListResponseSchema,
);

const listLaboratoriesRoute = listRoute(
  "/laboratories",
  "List the laboratories",
  "Lists every laboratory, a replaced one included, whose code the affiliationLaboratory filter of GET /service/samples takes.",
  laboratoryListResponseSchema,
);

export function registerGroupRoutes(
  app: OpenAPIHono<ServiceEnv>,
  manualGroups: Pick<ManualGroupRepository, "listWithPublishedSample">,
) {
  app
    .openapi(listManualGroupsRoute, async (c) =>
      c.json(
        {
          data: (await manualGroups.listWithPublishedSample()).map(
            ({ id, name }) => ({ id, name }),
          ),
        },
        200,
      ),
    )
    .openapi(listOrganizationsRoute, (c) =>
      c.json(
        {
          data: filterOrganizationsWithLaboratory().map(({ ror, name }) => ({
            ror,
            name,
          })),
        },
        200,
      ),
    )
    .openapi(listOsusRoute, (c) =>
      c.json({ data: OSUS.map(({ code, name }) => ({ code, name })) }, 200),
    )
    .openapi(listLaboratoriesRoute, (c) =>
      c.json(
        { data: LABORATORIES.map(({ code, name }) => ({ code, name })) },
        200,
      ),
    );
}
