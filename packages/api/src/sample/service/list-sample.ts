import type {
  AdminListSamplesResult,
  ListSamplesResult,
} from "@projet-igsn/domain/sample/repository";
import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";

import { splitBbox } from "@projet-igsn/domain/sample/split-bbox";
import { type Expression, sql, type SqlBool } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import { facetFilters } from "./facet-filter.ts";
import { institutionSampleWhere } from "./institution-sample-where.ts";
import { moderatedSampleWhere } from "./moderated-sample-where.ts";
import {
  sampleAttachmentsQuery,
  sampleLinksQuery,
  sampleManualGroupsQuery,
  sampleOwnerQuery,
} from "./sample-children-query.ts";
import {
  applyFuzzyThreshold,
  relevanceScore,
  searchFilters,
} from "./search-filter.ts";
import { toSample } from "./to-sample.ts";

function withinBbox(
  bbox: NonNullable<ListSamplesQuery["bbox"]>,
): Expression<SqlBool> {
  const envelopes = splitBbox(bbox).map(
    ({ west, south, east, north }) =>
      sql<SqlBool>`ST_Intersects(geom, ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326))`,
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

function isPublished(): Expression<SqlBool> {
  return sql<SqlBool>`published = true`;
}

async function listSamplesWhere(
  db: Transactional<DB>,
  params: ListSamplesQuery,
  scope: Expression<SqlBool>[],
  withOwner = false,
) {
  const { page, perPage, search, sort, order = "asc" } = params;

  return withTransaction(db, async (trx) => {
    await applyFuzzyThreshold(trx, search);

    const filters = [
      ...(search === undefined ? [] : searchFilters(search)),
      ...(params.bbox === undefined ? [] : [withinBbox(params.bbox)]),
      ...facetFilters(params),
      ...scope,
    ];
    const matching = () =>
      trx
        .selectFrom("sample")
        .$if(filters.length > 0, (qb) => qb.where((eb) => eb.and(filters)));

    const relevance = search === undefined ? undefined : relevanceScore(search);
    const rows = await matching()
      .selectAll()
      .select(sampleLinksQuery)
      .select(sampleAttachmentsQuery)
      .select(sampleManualGroupsQuery)
      .$if(withOwner, (qb) => qb.select(sampleOwnerQuery))
      .$if(sort === "status", (qb) => qb.orderBy(sql`igsn is not null`, order))
      .$call((qb) => (relevance ? qb.orderBy(relevance, "desc") : qb))
      .orderBy("updated_at", "desc")
      .orderBy("id", "desc")
      .limit(perPage)
      .offset((page - 1) * perPage)
      .execute();

    const { count } = await matching()
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow();

    return {
      data: rows.map((row) =>
        toSample(row, row.links, row.attachments, row.manualGroups),
      ),
      owners: new Map(rows.map((row) => [row.id, row.owner])),
      total: Number(count),
    };
  });
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
    [
      ...scope,
      ...(params.institution === undefined
        ? []
        : [institutionSampleWhere(params.institution)]),
      ...(params.ownerId === undefined
        ? []
        : [assignedTo(params.ownerId, "mine")]),
    ],
    true,
  );
  return {
    data: data.map((sample) => {
      const owner = owners.get(sample.id) ?? null;
      return {
        ...sample,
        owner:
          owner &&
          (withOwnerStatus
            ? owner
            : { name: owner.name, firstname: owner.firstname }),
      };
    }),
    total,
  };
}

export function listSamplesAssignedTo(
  db: Transactional<DB>,
  params: ListSamplesQuery,
  userId: string,
): Promise<AdminListSamplesResult> {
  return listWithOwners(db, params, [assignedTo(userId, params.ownership)]);
}

export function listModeratedSamples(
  db: Transactional<DB>,
  params: ListSamplesQuery,
  scope: ModerationScope,
): Promise<AdminListSamplesResult> {
  return listWithOwners(db, params, [moderatedSampleWhere(scope)], true);
}

export async function listPublishedSamples(
  db: Transactional<DB>,
  params: ListSamplesQuery,
): Promise<ListSamplesResult> {
  const { data, total } = await listSamplesWhere(db, params, [isPublished()]);
  return { data, total };
}
