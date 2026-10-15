# Map benchmark

What the search map costs at 500,000 published samples, measured on 2026-10-13 for server clustering and on 2026-10-14 for the browser clustering that replaced it (ADR [0061](adr/0061-browser-map-clustering.md)).

The sections up to "Reproducing" measure the removed `GET /samples/map`, before and after its proximity clusters.

## Browser clustering

- **Setup:** the dev stack, 500,000 uniform samples, headless Chromium 1400x900.
- **Before:** server proximity clusters (`46314aac`) re-requested `GET /samples/map` and the side list (500 full cards, total count) on every zoom or pan, about 3 s per move zoomed out.
- **Points request:** one `GET /samples/map/points` per filter set, 697 ms and 5.1 MB zstd over the wire (11.9 MB raw, 4.9 MB gzip), the query alone 363 to 432 ms.
- **Assembly:** rows become columns in JS, 35% faster than `array_agg`.
- **In the browser:** `JSON.parse` 35 ms, zod parse 51 ms, Supercluster index build (radius 40, extent 256, maxZoom 18) 3,049 ms.
- **Worker:** built on the main thread the index froze the page 3.1 s, and in a Web Worker (`1aec6dc8`) the longest main-thread task while opening is 206 ms.
- **Each zoom or pan:** no points request, clusters redraw in about 50 ms after the zoom animation, and the side list loads 20 cards (`withTotal=false`) in 0.4 to 0.5 s.
- **Single markers:** names come from `GET /samples/map/samples?numbers=`, at most 500 per call.
- **First markers:** about 7 s after page load on the dev (unminified) build, 2.3 s for the page and points and 4 s for the index build in the worker.
- **Memory:** one points request holds about 80 MB of api heap, so 20 concurrent from one IP could reach about 1.5 GB, and a cache of the unfiltered response or a concurrency cap is the follow-up if real volume nears 500,000.
- **Side list count:** points whose own position is in view, while the list matches whole shapes, so a partly visible area can be listed under a "0 results" header.

## Summary

- **World view, no filter:** p50 drops from 2,873 ms to 339 ms.
- **Zoomed views:** 5x to 35x faster, a 1 degree box going from about 200 ms to 6 ms.
- **Known regression:** the world view with 3 filters is about 20% slower (250 ms to 306 ms p50), not investigated.
- **Side list:** `GET /samples?viewport=...`, fired with each map move, is unchanged at 451 ms p50 for the world without filters.

## Setup

- **Host:** the dev container, 20 CPUs, 33 GB RAM, the dev compose Postgres (ParadeDB image, default settings).
- **Data:** 500,000 random published samples, point locations uniform over the world, no sub-samples, seeded by `make db-seed-bench BENCH_COUNT=500000`.
- **Run:** `pnpm -F @projet-igsn/api bench:grid --size 500k --endpoints map` in the api container, each case alone, 30 timed runs.
- **Scope:** calls `mapPublishedSamples` directly, with no HTTP and no rate limit.
- **Filters:** the first N of material rock, nature hand_sample, type core, institutional organization, collection method coring.

## Implementations

- **Before** (`ad295a73`): clusters by `ST_SnapToGrid` on degree cells, one JSON object per sample, and a separate extent query.
- **After** (`46314aac`): one aggregate per fine cell (count, mean, min, max) with no join, then a greedy 40 px proximity merge, fullest first.
- The extent comes from the returned clusters, sample payloads load only for one-sample clusters, and `set local jit = off` applies.
- A density grid was tried and rejected: the clusters read as a sparse lattice, so proximity clusters with bubbles sized by count replaced it.

## Results

| View (viewport, zoom)             | Filters | Matching | Before p50 / p95 | After p50 / p95 |
| --------------------------------- | ------- | -------- | ---------------- | --------------- |
| World (-180,-90,180,90), z2       | 0       | 500,000  | 2,873 / 3,507    | 339 / 444       |
| World, z2                         | 1       | 455,536  | 2,028 / 2,492    | 690 / 911       |
| World, z2                         | 3       | 25,079   | 250 / 322        | 306 / 401       |
| World, z2                         | 5       | 19       | 14 / 17          | 19 / 22         |
| Western Europe (-10,36,20,60), z5 | 0       | 5,471    | 300 / 378        | 50 / 56         |
| Western Europe, z5                | 1       | 4,980    | 245 / 333        | 45 / 51         |
| Western Europe, z5                | 3       | 264      | 88 / 93          | 17 / 18         |
| Western Europe, z5                | 5       | 0        | 11 / 13          | 9 / 11          |
| France (-5,42,8,51), z7           | 0       | 899      | 220 / 256        | 34 / 42         |
| France, z7                        | 1       | 829      | 245 / 311        | 38 / 45         |
| France, z7                        | 3       | 46       | 84 / 96          | 11 / 12         |
| France, z7                        | 5       | 0        | 14 / 17          | 4 / 5           |
| 1 degree box (2,48,3,49), z10     | 0       | 15       | 203 / 244        | 6 / 7           |
| 1 degree box, z10                 | 1       | 13       | 233 / 319        | 6 / 7           |
| 1 degree box, z10                 | 3       | 1        | 77 / 89          | 4 / 6           |
| 1 degree box, z10                 | 5       | 0        | 9 / 11           | 4 / 6           |

- Times are in milliseconds over 30 runs.

## Where the time went

- **World view before:** a 3.07 s cluster query, 2 s of it in a single-threaded final aggregate building one JSON object per sample, plus a 0.46 s extent query.
- **Every zoomed request before:** 0.2 to 0.46 s in the extent query alone, a full scan.
- **JIT:** about 1.1 s of the 1.5 s world view, hence `jit = off`.

## Seeding

- Sequential seeding of 500,000 samples took 11 min 36 s.
- 8 concurrent batches cut a 40,000 run from 97 s to 32 s, and 16 batches were no better, so `seed-bench.ts` runs 8.
- Larger batches were no better, 2,000 rows being slower than 1,000.
- One statement cannot exceed Postgres' 65,535 bind parameters, about 2,400 sample rows.

## Reproducing

- Seed with `make db-seed-bench BENCH_COUNT=500000`, then run `pnpm -F @projet-igsn/api bench:grid --size 500k --endpoints map`.
- The `viewport-world` list case measures the side list.
