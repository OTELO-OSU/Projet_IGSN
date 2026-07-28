import type {
  ListSamplesParams,
  ListSamplesResult,
} from "@projet-igsn/domain/sample/repository";

import { type Expression, sql, type SqlBool } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import { facetFilters } from "./facet-filter.ts";
import {
  applyFuzzyThreshold,
  relevanceScore,
  searchFilters,
} from "./search-filter.ts";
import { withSampleChildren } from "./with-sample-children.ts";

// Rows whose generated geom intersects the drawn box, bound as parameters.
// ponytail: ST_MakeEnvelope does not wrap the antimeridian; a box crossing
// longitude 180 (west > east) is out of v1 scope and rejected by the domain
// schema, so it never reaches here. Split it client-side if it ever matters.
function withinBbox(
  bbox: NonNullable<ListSamplesParams["bbox"]>,
): Expression<SqlBool> {
  return sql<SqlBool>`ST_Intersects(
    geom,
    ST_MakeEnvelope(${bbox.west}, ${bbox.south}, ${bbox.east}, ${bbox.north}, 4326)::geography
  )`;
}

// A scope predicate joins the filter array, so it applies to the count query
// too: a total that counted other people's samples would lie about the dataset.
function ownedBy(ownerId: string): Expression<SqlBool> {
  return sql<SqlBool>`exists (
    select 1 from user_sample
     where user_sample.sample_id = sample.id
       and user_sample.user_id = ${ownerId}
  )`;
}

function isPublished(): Expression<SqlBool> {
  return sql<SqlBool>`published = true`;
}

// Who the list is for is a separate argument from `params` (the validated query),
// and every entry point below names it: the caller's identity and the visibility
// rule come from the server, never from the query string.
async function listSamplesWhere(
  db: Transactional<DB>,
  params: ListSamplesParams,
  scope: Expression<SqlBool>[],
): Promise<ListSamplesResult> {
  const { page, perPage, search, sort, order = "asc" } = params;

  // A transaction of its own if the caller has none: the fuzzy threshold is set
  // transaction-locally, and both queries must see the same one.
  return withTransaction(db, async (trx) => {
    await applyFuzzyThreshold(trx, search);

    const filters = [
      ...(search === undefined ? [] : searchFilters(search)),
      ...(params.bbox === undefined ? [] : [withinBbox(params.bbox)]),
      ...facetFilters(params),
      ...scope,
    ];
    // Shared by the page and the count, so a filter can never reach one only.
    const matching = () =>
      trx
        .selectFrom("sample")
        .$if(filters.length > 0, (qb) => qb.where((eb) => eb.and(filters)));

    const relevance = search === undefined ? undefined : relevanceScore(search);
    const rows = await matching()
      .selectAll()
      // Status is IGSN presence; last-modified stays as the tiebreak.
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
      data: await withSampleChildren(trx, rows),
      total: Number(count),
    };
  });
}

// `ownerId` is a required positional argument, so a direct call that omits it
// does not compile. The
// repository wiring can still satisfy `SampleRepository.list` while ignoring
// its `ownerId` (structural typing); the admin-routes authorization spec is
// what catches that.
export function listSamplesByOwner(
  db: Transactional<DB>,
  params: ListSamplesParams,
  ownerId: string,
): Promise<ListSamplesResult> {
  return listSamplesWhere(db, params, [ownedBy(ownerId)]);
}

export function listPublishedSamples(
  db: Transactional<DB>,
  params: ListSamplesParams,
): Promise<ListSamplesResult> {
  return listSamplesWhere(db, params, [isPublished()]);
}
