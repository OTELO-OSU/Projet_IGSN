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

// The public list shows published samples only; the admin list shows the
// caller's own. Neither comes from the query string.
type ListSamplesOptions = {
  publishedOnly?: boolean;
  ownerId?: string;
};

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

// Rows the user owns. An admin list is scoped to its caller, so the predicate
// joins the filter array and applies to the count query too: a total that
// counted other people's samples would lie about the dataset.
function ownedBy(ownerId: string): Expression<SqlBool> {
  return sql<SqlBool>`exists (
    select 1 from user_sample
     where user_sample.sample_id = sample.id
       and user_sample.user_id = ${ownerId}
  )`;
}

export async function listSamples(
  db: Transactional<DB>,
  params: ListSamplesParams,
  { publishedOnly = false, ownerId }: ListSamplesOptions = {},
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
      ...(ownerId === undefined ? [] : [ownedBy(ownerId)]),
    ];
    // Shared by the page and the count, so a filter can never reach one only.
    const matching = () =>
      trx
        .selectFrom("sample")
        .$if(publishedOnly, (qb) => qb.where("published", "=", true))
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
