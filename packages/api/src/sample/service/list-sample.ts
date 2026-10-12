import type { ExportSamplesRequest } from "@projet-igsn/domain/sample/export/export-validator";
import type {
  AdminListSamplesResult,
  ListSamplesResult,
} from "@projet-igsn/domain/sample/repository";
import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";

import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import { MINERAL_MATERIAL_ROOT } from "@projet-igsn/domain/sample/mineral/allows-mineral-classifications";
import { sampleStatusSchema } from "@projet-igsn/domain/sample/sample";
import { splitBbox } from "@projet-igsn/domain/sample/split-bbox";
import { SYNTHETIC_MATERIAL_ROOT } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { HTTPException } from "hono/http-exception";
import { type Expression, sql, type SqlBool } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import {
  facetFilters,
  type LinkedAccounts,
  personFacetValues,
} from "./facet-filter.ts";
import { institutionSampleWhere } from "./institution-sample-where.ts";
import { moderatedSampleWhere } from "./moderated-sample-where.ts";
import {
  sampleAdditionalRolesQuery,
  sampleAttachmentsQuery,
  sampleChildrenQuery,
  sampleHasSubSamplesQuery,
  sampleLocationQuery,
  sampleManualGroupsQuery,
  sampleMineralClassificationsQuery,
  sampleOwnerQuery,
  sampleParentsQuery,
  sampleSeriesQuery,
  samplePersonAccountsQuery,
  sampleProcessStepsQuery,
  sampleRelationsQuery,
} from "./sample-children-query.ts";
import {
  applyFuzzyThreshold,
  forceCustomPlan,
  relevanceScore,
  searchFilters,
} from "./search-filter.ts";
import { toSample } from "./to-sample.ts";

function withinBbox(
  bbox: NonNullable<ListSamplesQuery["bbox"]>,
): Expression<SqlBool> {
  const envelopes = splitBbox(bbox).map(
    ({ west, south, east, north }) =>
      sql<SqlBool>`ST_Intersects(sample.location_geom, ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326))`,
  );
  return sql<SqlBool>`(${sql.join(envelopes, sql` OR `)})`;
}

function assignedTo(
  userId: string,
  ownership: ListSamplesQuery["ownership"],
): Expression<SqlBool> {
  const role =
    ownership === undefined
      ? sql``
      : sql`and user_sample.role ${ownership === "mine" ? sql`=` : sql`<>`} ${"owner"}`;
  return sql<SqlBool>`exists (
    select 1 from user_sample
     where user_sample.sample_id = sample.id
       and user_sample.user_id = ${userId}
       ${role}
  )`;
}

function hasStatus(
  status: NonNullable<ListSamplesQuery["status"]>,
): Expression<SqlBool> {
  return sql<SqlBool>`status = ${status}`;
}

function isPublished(): Expression<SqlBool> {
  return sql<SqlBool>`status = 'published'`;
}

export function sampleFilters(
  params: Partial<ListSamplesQuery>,
  linkedAccounts?: LinkedAccounts,
): Expression<SqlBool>[] {
  return [
    ...(params.search === undefined ? [] : searchFilters(params.search)),
    ...(params.bbox === undefined ? [] : [withinBbox(params.bbox)]),
    ...(params.viewport === undefined ? [] : [withinBbox(params.viewport)]),
    ...facetFilters(params, linkedAccounts),
  ];
}

export function publishedScope(
  params: Pick<ListSamplesQuery, "includeSubSamples">,
): Expression<SqlBool>[] {
  return [
    isPublished(),
    ...(params.includeSubSamples === true
      ? []
      : [sql<SqlBool>`not sample.is_sub_sample`]),
  ];
}

function isNotTombstone(): Expression<SqlBool> {
  return sql<SqlBool>`status <> 'tombstone'`;
}

const lifecycleOrder = sql`array_position(${sql.val(
  sampleStatusSchema.options,
)}::text[], status)`;

async function listSamplesWhere(
  db: Transactional<DB>,
  params: ListSamplesQuery,
  scope: Expression<SqlBool>[],
  withOwner = false,
) {
  const { page, perPage, search, sort, order = "asc" } = params;

  return withTransaction(db, async (trx) => {
    if (search !== undefined) await forceCustomPlan(trx);
    await applyFuzzyThreshold(trx, personFacetValues(params));

    const filters = [
      ...sampleFilters(params),
      ...(params.status === undefined ? [] : [hasStatus(params.status)]),
      ...scope,
    ];
    const matching = () =>
      trx
        .selectFrom("sample")
        .$if(filters.length > 0, (qb) => qb.where((eb) => eb.and(filters)));

    const relevance = search === undefined ? undefined : relevanceScore(search);
    const offset = (page - 1) * perPage;
    const pageKeys = matching()
      .select((eb) => [
        "sample.id",
        "sample.updated_at",
        eb.fn.countAll<string>().over().as("total"),
      ])
      .$if(sort === "status", (qb) =>
        qb
          .select(lifecycleOrder.as("lifecycle"))
          .orderBy(lifecycleOrder, order),
      )
      .$if(sort === "igsn", (qb) =>
        qb.select("sample.igsn").orderBy("sample.igsn", order),
      )
      .$call((qb) =>
        relevance
          ? qb.select(relevance.as("relevance")).orderBy(relevance, "desc")
          : qb,
      )
      .orderBy("sample.updated_at", "desc")
      .orderBy("sample.id", "desc")
      .limit(perPage)
      .offset(offset);

    const rows = await trx
      .selectFrom(pageKeys.as("page"))
      .innerJoin("sample", "sample.id", "page.id")
      .selectAll("sample")
      .select("page.total")
      .select(sampleLocationQuery)
      .select(sampleRelationsQuery)
      .select(sampleProcessStepsQuery)
      .select(sampleMineralClassificationsQuery)
      .select(sampleAdditionalRolesQuery)
      .select(sampleAttachmentsQuery)
      .select(sampleManualGroupsQuery)
      .select(sampleParentsQuery)
      .select(sampleChildrenQuery)
      .select(sampleSeriesQuery)
      .select(sampleHasSubSamplesQuery)
      .select(samplePersonAccountsQuery)
      .$if(withOwner, (qb) => qb.select(sampleOwnerQuery))
      .$if(sort === "status", (qb) =>
        qb.orderBy(sql.ref("page.lifecycle"), order),
      )
      .$if(sort === "igsn", (qb) => qb.orderBy(sql.ref("page.igsn"), order))
      .$if(relevance !== undefined, (qb) =>
        qb.orderBy(sql.ref("page.relevance"), "desc"),
      )
      .orderBy("page.updated_at", "desc")
      .orderBy("page.id", "desc")
      .execute();

    const total =
      rows[0]?.total ??
      (offset === 0
        ? 0
        : (
            await matching()
              .select((eb) => eb.fn.countAll<string>().as("count"))
              .executeTakeFirstOrThrow()
          ).count);

    return {
      data: rows.map((row) => toSample(row)),
      owners: new Map(rows.map((row) => [row.id, row.owner])),
      total: Number(total),
    };
  });
}

function adminFilters(
  params: Pick<
    ListSamplesQuery,
    | "institution"
    | "ownerId"
    | "existenceStatus"
    | "availabilityStatus"
    | "synchronizationStatus"
  >,
): Expression<SqlBool>[] {
  return [
    ...(params.institution === undefined
      ? []
      : [institutionSampleWhere(params.institution)]),
    ...(params.ownerId === undefined
      ? []
      : [assignedTo(params.ownerId, "mine")]),
    ...(params.existenceStatus === undefined
      ? []
      : [sql<SqlBool>`existence_status = ${params.existenceStatus}`]),
    ...(params.availabilityStatus === undefined
      ? []
      : [sql<SqlBool>`availability_status = ${params.availabilityStatus}`]),
    ...(params.synchronizationStatus === undefined
      ? []
      : [
          sql<SqlBool>`synchronization_status = ${params.synchronizationStatus}`,
        ]),
  ];
}

async function listWithOwners(
  db: Transactional<DB>,
  params: ListSamplesQuery,
  scope: Expression<SqlBool>[],
  withOwnerStatus = false,
): Promise<AdminListSamplesResult> {
  const { data, owners, total } = await listSamplesWhere(
    db,
    params,
    [...scope, ...adminFilters(params)],
    true,
  );
  return {
    data: withOwnerStatus
      ? data.map((sample) => ({
          ...sample,
          owner: owners.get(sample.id) ?? null,
        }))
      : data,
    total,
  };
}

export function listSamplesAssignedTo(
  db: Transactional<DB>,
  params: ListSamplesQuery,
  userId: string,
): Promise<AdminListSamplesResult> {
  return listWithOwners(db, params, [
    assignedTo(userId, params.ownership),
    isNotTombstone(),
  ]);
}

export function listModeratedSamples(
  db: Transactional<DB>,
  params: ListSamplesQuery,
  scope: ModerationScope,
): Promise<AdminListSamplesResult> {
  return listWithOwners(db, params, [moderatedSampleWhere(scope)], true);
}

export function listPublishedSamplesForService(
  db: Transactional<DB>,
  params: ListSamplesQuery,
  scope: ModerationScope,
  editableOnly: boolean,
): Promise<AdminListSamplesResult> {
  return listWithOwners(db, params, [
    isPublished(),
    ...(editableOnly ? [moderatedSampleWhere(scope)] : []),
  ]);
}

export async function listPublishedSamples(
  db: Transactional<DB>,
  params: ListSamplesQuery,
): Promise<ListSamplesResult> {
  const { data, total } = await listSamplesWhere(
    db,
    params,
    publishedScope(params),
  );
  return { data, total };
}

const isOutside = (root: string) =>
  sql<SqlBool>`(material is null or not material <@ ${root}::ltree)`;

const EXPORTABLE = [
  isPublished(),
  isOutside(SYNTHETIC_MATERIAL_ROOT),
  isOutside(MINERAL_MATERIAL_ROOT),
];

function reachOf(
  request: ExportSamplesRequest,
  userId: string,
  scope: ModerationScope | null,
): Expression<SqlBool> {
  if (!request.moderated) {
    return assignedTo(
      userId,
      request.mode === "filters" ? request.query.ownership : undefined,
    );
  }
  if (!scope) throw new HTTPException(403, { message: "Forbidden" });
  return moderatedSampleWhere(scope);
}

function selectionOf(request: ExportSamplesRequest): Expression<SqlBool>[] {
  return request.mode === "ids"
    ? [sql<SqlBool>`sample.id in (${sql.join(request.ids)})`]
    : adminFilters(request.query);
}

export async function listExportableSamples(
  db: Transactional<DB>,
  request: ExportSamplesRequest,
  userId: string,
  scope: ModerationScope | null,
): Promise<ListSamplesResult> {
  const { data, total } = await listSamplesWhere(
    db,
    {
      ...(request.mode === "filters" ? request.query : {}),
      page: 1,
      perPage: MAX_IMPORT_ROWS,
    },
    [...EXPORTABLE, reachOf(request, userId, scope), ...selectionOf(request)],
  );
  if (total > MAX_IMPORT_ROWS) {
    throw new HTTPException(422, {
      message: `Cannot export more than ${MAX_IMPORT_ROWS} samples`,
    });
  }
  return { data, total };
}
